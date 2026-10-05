#include <jni.h>
#include "llama.h"
#include <atomic>
#include <algorithm>
#include <chrono>
#include <mutex>
#include <stdexcept>
#include <string>
#include <vector>
#include <memory>

static std::mutex model_mutex;
static std::atomic<bool> cancelled{true};
static std::chrono::steady_clock::time_point deadline;
static llama_model *model = nullptr;
static llama_context *context = nullptr;
static bool backend_ready = false;

static bool should_abort(void *) {
    return cancelled.load() || std::chrono::steady_clock::now() > deadline;
}
static bool load_progress(float, void *) { return !cancelled.load(); }
static void free_model() {
    if (context) { llama_free(context); context = nullptr; }
    if (model) { llama_model_free(model); model = nullptr; }
}
static void throw_java(JNIEnv *env, const char *message) {
    env->ThrowNew(env->FindClass("java/lang/IllegalStateException"), message);
}
static std::string read_bytes(JNIEnv *env, jbyteArray bytes) {
    const jsize size = env->GetArrayLength(bytes);
    std::string result(static_cast<size_t>(size), '\0');
    env->GetByteArrayRegion(bytes, 0, size, reinterpret_cast<jbyte *>(result.data()));
    return result;
}
extern "C" JNIEXPORT void JNICALL Java_com_zeroapply_app_android_LlamaNative_beginSession(JNIEnv *, jclass) {
    cancelled.store(false);
}
extern "C" JNIEXPORT void JNICALL Java_com_zeroapply_app_android_LlamaNative_cancel(JNIEnv *, jclass) {
    cancelled.store(true);
}
extern "C" JNIEXPORT void JNICALL Java_com_zeroapply_app_android_LlamaNative_unload(JNIEnv *, jclass) {
    std::lock_guard<std::mutex> lock(model_mutex);
    free_model();
}
extern "C" JNIEXPORT void JNICALL Java_com_zeroapply_app_android_LlamaNative_load(JNIEnv *env, jclass, jstring path, jint threads) {
    std::lock_guard<std::mutex> lock(model_mutex);
    try {
        if (cancelled.load()) throw std::runtime_error("AI startup was stopped.");
        free_model();
        if (!backend_ready) { llama_backend_init(); backend_ready = true; }
        const char *raw_path = env->GetStringUTFChars(path, nullptr);
        const std::string model_path(raw_path);
        env->ReleaseStringUTFChars(path, raw_path);
        auto model_params = llama_model_default_params();
        model_params.n_gpu_layers = 0;
        model_params.load_mode = LLAMA_LOAD_MODE_MMAP;
        model_params.progress_callback = load_progress;
        model = llama_model_load_from_file(model_path.c_str(), model_params);
        if (!model || cancelled.load()) throw std::runtime_error("The phone could not load the AI model. Stop other apps and retry.");
        auto params = llama_context_default_params();
        params.n_ctx = 2048;
        params.n_batch = 128;
        params.n_ubatch = 128;
        params.n_threads = std::max(1, std::min(2, static_cast<int>(threads)));
        params.n_threads_batch = params.n_threads;
        params.abort_callback = should_abort;
        deadline = std::chrono::steady_clock::now() + std::chrono::seconds(180);
        context = llama_init_from_model(model, params);
        if (!context || cancelled.load()) throw std::runtime_error("The phone has insufficient free memory for AI.");
    } catch (const std::exception &error) { free_model(); throw_java(env, error.what()); }
}
extern "C" JNIEXPORT jbyteArray JNICALL Java_com_zeroapply_app_android_LlamaNative_generate(JNIEnv *env, jclass, jbyteArray prompt_bytes, jbyteArray system_bytes, jint limit) {
    std::lock_guard<std::mutex> lock(model_mutex);
    try {
        if (!model || !context || cancelled.load()) throw std::runtime_error("AI is off. Click Review & start AutoApply first.");
        deadline = std::chrono::steady_clock::now() + std::chrono::seconds(120);
        const std::string prompt = read_bytes(env, prompt_bytes);
        const std::string system = read_bytes(env, system_bytes);
        const llama_chat_message messages[] = {{"system", system.c_str()}, {"user", prompt.c_str()}};
        const char *chat_template = llama_model_chat_template(model, nullptr);
        const int needed = llama_chat_apply_template(chat_template, messages, 2, true, nullptr, 0);
        if (needed <= 0 || needed > 32000) throw std::runtime_error("AI prompt is too long or its template is unsupported.");
        std::vector<char> formatted(static_cast<size_t>(needed) + 1);
        const int written = llama_chat_apply_template(chat_template, messages, 2, true, formatted.data(), formatted.size());
        const auto *vocab = llama_model_get_vocab(model);
        const int count = -llama_tokenize(vocab, formatted.data(), written, nullptr, 0, true, true);
        const int max_tokens = std::max(1, std::min(256, static_cast<int>(limit)));
        if (count <= 0 || count + max_tokens > 2048) throw std::runtime_error("Too much resume context. Shorten the text and retry.");
        std::vector<llama_token> tokens(count);
        if (llama_tokenize(vocab, formatted.data(), written, tokens.data(), count, true, true) < 0) throw std::runtime_error("Could not prepare the AI prompt.");
        llama_memory_clear(llama_get_memory(context), true);
        std::unique_ptr<llama_batch_ext, decltype(&llama_batch_ext_free)> batch(llama_batch_ext_init(context), llama_batch_ext_free);
        std::unique_ptr<llama_sampler, decltype(&llama_sampler_free)> sampler(llama_sampler_init_greedy(), llama_sampler_free);
        if (!batch || !sampler) throw std::runtime_error("Could not allocate AI working memory.");
        for (int offset = 0; offset < count; offset += 128) {
            if (should_abort(nullptr)) throw std::runtime_error("AI generation stopped or timed out.");
            llama_batch_ext_clear(batch.get());
            const int size = std::min(128, count - offset);
            for (int i = 0; i < size; ++i) {
                const int index = llama_batch_ext_add_token(batch.get(), 0, tokens[offset+i]);
                const llama_pos position = offset+i;
                llama_batch_ext_set_pos(batch.get(), index, &position);
                if (offset+i == count-1) llama_batch_ext_set_output_logits(batch.get(), index, true);
            }
            if (llama_process(context, LLAMA_PROCESS_TYPE_DECODE, batch.get()) != 0) throw std::runtime_error("AI stopped while reading the question.");
        }
        std::string result;
        for (int i = 0; i < max_tokens; ++i) {
            if (should_abort(nullptr)) throw std::runtime_error("AI generation stopped or timed out.");
            const llama_token token = llama_sampler_sample(sampler.get(), context, -1);
            if (llama_vocab_is_eog(vocab, token)) break;
            std::vector<char> piece(256);
            int size = llama_token_to_piece(vocab, token, piece.data(), piece.size(), 0, true);
            if (size < 0) { piece.resize(-size); size = llama_token_to_piece(vocab, token, piece.data(), piece.size(), 0, true); }
            if (size < 0) throw std::runtime_error("Could not decode the AI answer.");
            result.append(piece.data(), size);
            llama_batch_ext_clear(batch.get());
            const int index = llama_batch_ext_add_token(batch.get(), 0, token);
            const llama_pos position = count+i;
            llama_batch_ext_set_pos(batch.get(), index, &position);
            llama_batch_ext_set_output_logits(batch.get(), index, true);
            if (i+1 < max_tokens && llama_process(context, LLAMA_PROCESS_TYPE_DECODE, batch.get()) != 0) throw std::runtime_error("AI stopped while answering.");
        }
        if (result.empty()) throw std::runtime_error("AI returned no answer. Review this field manually.");
        jbyteArray output = env->NewByteArray(result.size());
        env->SetByteArrayRegion(output, 0, result.size(), reinterpret_cast<const jbyte *>(result.data()));
        return output;
    } catch (const std::exception &error) { throw_java(env, error.what()); return nullptr; }
}
