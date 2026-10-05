/**
 * ZeroApply - Community Notification Store
 * Manages user-submitted and auto-detected WhatsApp & Telegram community join links.
 * Provides real-time synchronization, persistence, and event notifications without any mock/demo data.
 */

export interface CommunityNotification {
  id: string;
  platform: 'whatsapp' | 'telegram';
  title: string;
  url: string;
  description: string;
  source: 'official' | 'detected' | 'user';
  companyName?: string;
  timestamp: string;
  membersCount?: string;
  category?: string;
  unread?: boolean;
}

const STORAGE_KEY = 'zeroapply_community_notifications_v1';

class CommunityNotificationStore {
  private notifications: CommunityNotification[] = [];
  private listeners: Set<(items: CommunityNotification[]) => void> = new Set();

  constructor() {
    this.load();
  }

  private isDemoItem(item: CommunityNotification): boolean {
    if (!item) return true;
    const id = item.id || '';
    const url = item.url || '';
    if (id.startsWith('official-wa-') || id.startsWith('official-tg-')) return true;
    if (url.includes('zeroapply-official-jobs') || url.includes('zeroapply_jobs') || url.includes('offcampus-fresher-network') || url.includes('zeroapply_developers')) {
      return true;
    }
    return false;
  }

  private load(): void {
    if (typeof localStorage === 'undefined') {
      this.notifications = [];
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Strictly purge any legacy demo / mock seed items
          this.notifications = parsed.filter((item) => !this.isDemoItem(item));
          this.save();
          return;
        }
      }
    } catch {
      // Fallback
    }
    this.notifications = [];
    this.save();
  }

  private save(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
    } catch {}
  }

  public getNotifications(): CommunityNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => n.unread).length;
  }

  public addNotification(
    data: Omit<CommunityNotification, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): CommunityNotification {
    const cleanUrl = (data.url || '').trim();
    if (!cleanUrl) throw new Error('Notification URL is required');

    // Prevent duplicate entries for the exact same URL
    const existingIndex = this.notifications.findIndex(
      (n) => n.url.toLowerCase() === cleanUrl.toLowerCase()
    );

    const notification: CommunityNotification = {
      id: data.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      platform: data.platform,
      title: data.title.trim() || (data.platform === 'whatsapp' ? 'WhatsApp Community Link' : 'Telegram Channel Link'),
      url: cleanUrl,
      description: (data.description || '').trim() || `Join this ${data.platform === 'whatsapp' ? 'WhatsApp group' : 'Telegram channel'} for updates.`,
      source: data.source || 'user',
      companyName: data.companyName,
      category: data.category || (data.source === 'detected' ? 'Job Detected' : 'Community'),
      membersCount: data.membersCount,
      timestamp: data.timestamp || new Date().toISOString(),
      unread: true,
    };

    if (existingIndex >= 0) {
      // Update existing item and move to front
      this.notifications.splice(existingIndex, 1);
    }

    this.notifications.unshift(notification);
    this.save();
    this.notifyListeners();
    return notification;
  }

  public deleteNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.save();
    this.notifyListeners();
  }

  public clearAll(): void {
    this.notifications = [];
    this.save();
    this.notifyListeners();
  }

  public markAllAsRead(): void {
    let changed = false;
    for (const n of this.notifications) {
      if (n.unread) {
        n.unread = false;
        changed = true;
      }
    }
    if (changed) {
      this.save();
      this.notifyListeners();
    }
  }

  public clearNonOfficial(): void {
    this.clearAll();
  }

  public subscribe(listener: (items: CommunityNotification[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const copy = [...this.notifications];
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch {}
    }
  }
}

export const communityNotificationStore = new CommunityNotificationStore();
