"""Merge electron-builder v26 macOS feeds without external dependencies."""
from pathlib import Path
import re
import sys

feeds = sorted(Path(sys.argv[1]).glob('*/latest-mac.yml'))
if len(feeds) != 2:
    raise SystemExit('Expected verified Intel and Apple Silicon macOS update feeds.')
texts = [feed.read_text() for feed in feeds]
versions = [re.search(r'^version: (.+)$', text, re.M).group(1) for text in texts]
if len(set(versions)) != 1:
    raise SystemExit('Cannot merge feeds from different releases.')
files = []
for text in texts:
    match = re.search(r'^files:\n(.*?)(?=^\S)', text, re.M | re.S)
    if not match:
        raise SystemExit('Unexpected macOS update metadata format.')
    files.append(match.group(1))
merged = re.sub(r'^files:\n.*?(?=^\S)', lambda _: 'files:\n' + ''.join(files), texts[0], count=1, flags=re.M | re.S)
for feed in feeds:
    feed.unlink()
(Path(sys.argv[1]) / 'latest-mac.yml').write_text(merged)
