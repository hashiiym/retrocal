// Google Calendar API integration & mock calendar sync provider
// Initialized using Vite environment variables (VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_API_KEY)

const GCAL_PREF_KEY = 'retrocal_gcal_pref';
const GCAL_EVENTS_KEY = 'retrocal_gcal_events';

// Read Google credentials from Vite environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Default sample Google Calendar events for instant out-of-the-box demonstration
const generateSampleGoogleEvents = () => {
  const today = new Date();
  const formatIsoDate = (d) => d.toISOString().split('T')[0];

  const todayStr = formatIsoDate(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatIsoDate(tomorrow);

  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = formatIsoDate(dayAfter);

  return [
    {
      id: 'gcal-evt-1',
      title: 'Google Meet: Weekly Team Sync',
      date: todayStr,
      startTime: '10:00',
      endTime: '11:00',
      description: 'Review product sprint progress & architectural updates.',
      location: 'meet.google.com/xyz-retro-abc',
      isGoogle: true,
      color: '#000000',
    },
    {
      id: 'gcal-evt-2',
      title: 'Client Strategy Workshop',
      date: todayStr,
      startTime: '15:30',
      endTime: '16:30',
      description: 'Discuss Q4 roadmap and deliverables.',
      location: 'Conference Room B / Google Meet',
      isGoogle: true,
      color: '#000000',
    },
    {
      id: 'gcal-evt-3',
      title: 'Sprint Demo & Architecture Review',
      date: tomorrowStr,
      startTime: '13:00',
      endTime: '14:30',
      description: 'Present RetroCal MVP live to stakeholders.',
      location: 'Virtual',
      isGoogle: true,
      color: '#000000',
    },
    {
      id: 'gcal-evt-4',
      title: 'Product Design Crit',
      date: dayAfterStr,
      startTime: '11:00',
      endTime: '12:00',
      description: 'Evaluate classic Macintosh monochrome typography.',
      location: 'Google Meet',
      isGoogle: true,
      color: '#000000',
    }
  ];
};

class GoogleCalendarManager {
  constructor() {
    this.listeners = new Set();
    this.clientId = GOOGLE_CLIENT_ID || '';
    this.apiKey = GOOGLE_API_KEY || '';
    this.connected = Boolean(GOOGLE_CLIENT_ID || GOOGLE_API_KEY);
    this.enabled = true;
    this.events = [];
    this.init();
  }

  init() {
    try {
      const pref = localStorage.getItem(GCAL_PREF_KEY);
      if (pref) {
        const parsed = JSON.parse(pref);
        this.enabled = parsed.enabled !== false;
      }

      const savedEvts = localStorage.getItem(GCAL_EVENTS_KEY);
      if (savedEvts) {
        this.events = JSON.parse(savedEvts);
      } else {
        this.events = generateSampleGoogleEvents();
        localStorage.setItem(GCAL_EVENTS_KEY, JSON.stringify(this.events));
      }
    } catch (e) {
      this.events = generateSampleGoogleEvents();
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getEvents()));
  }

  isGoogleConfigured() {
    return Boolean(GOOGLE_CLIENT_ID || GOOGLE_API_KEY);
  }

  getEnvStatus() {
    return {
      hasClientId: Boolean(GOOGLE_CLIENT_ID),
      hasApiKey: Boolean(GOOGLE_API_KEY),
      clientIdPreview: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 15) + '...' : null,
      apiKeyPreview: GOOGLE_API_KEY ? GOOGLE_API_KEY.substring(0, 8) + '...' : null,
      connected: this.isGoogleConfigured(),
    };
  }

  savePref(updates) {
    try {
      const current = { enabled: this.enabled };
      const merged = { ...current, ...updates };
      localStorage.setItem(GCAL_PREF_KEY, JSON.stringify(merged));
      this.enabled = merged.enabled;
      this.notify();
    } catch {}
  }

  getEvents() {
    if (!this.enabled) return [];
    return this.events;
  }

  toggleEnabled() {
    this.savePref({ enabled: !this.enabled });
  }

  disconnect() {
    this.savePref({ enabled: false });
    this.events = [];
    localStorage.removeItem(GCAL_EVENTS_KEY);
    this.notify();
  }

  connectDemoEvents() {
    this.events = generateSampleGoogleEvents();
    localStorage.setItem(GCAL_EVENTS_KEY, JSON.stringify(this.events));
    this.savePref({ enabled: true });
    this.notify();
  }

  // Parse iCalendar (.ics) format for easy real calendar import
  importICS(icsText) {
    try {
      const lines = icsText.split(/\r\n|\n|\r/);
      const events = [];
      let inEvent = false;
      let current = {};

      for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) {
          inEvent = true;
          current = {};
        } else if (line.startsWith('END:VEVENT')) {
          if (current.title && current.date) {
            events.push({
              id: 'ics-' + Math.random().toString(36).substr(2, 7),
              title: current.title,
              date: current.date,
              startTime: current.startTime || '09:00',
              endTime: current.endTime || '10:00',
              description: current.description || 'Imported from iCal/Google Calendar',
              location: current.location || '',
              isGoogle: true,
              color: '#000000',
            });
          }
          inEvent = false;
        } else if (inEvent) {
          if (line.startsWith('SUMMARY:')) {
            current.title = line.replace('SUMMARY:', '').trim();
          } else if (line.startsWith('DTSTART')) {
            const val = line.split(':')[1];
            if (val && val.length >= 8) {
              const year = val.substring(0, 4);
              const month = val.substring(4, 6);
              const day = val.substring(6, 8);
              current.date = `${year}-${month}-${day}`;
              if (val.includes('T')) {
                const timePart = val.split('T')[1];
                current.startTime = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
              }
            }
          } else if (line.startsWith('DTEND')) {
            const val = line.split(':')[1];
            if (val && val.includes('T')) {
              const timePart = val.split('T')[1];
              current.endTime = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
            }
          } else if (line.startsWith('DESCRIPTION:')) {
            current.description = line.replace('DESCRIPTION:', '').trim();
          } else if (line.startsWith('LOCATION:')) {
            current.location = line.replace('LOCATION:', '').trim();
          }
        }
      }

      if (events.length > 0) {
        this.events = [...events, ...this.events];
        localStorage.setItem(GCAL_EVENTS_KEY, JSON.stringify(this.events));
        this.savePref({ enabled: true });
        this.notify();
        return events.length;
      }
      return 0;
    } catch (e) {
      console.error('Failed to parse ICS:', e);
      return 0;
    }
  }

  // Live Google Calendar API v3 fetch via access token
  async fetchLiveGoogleCalendarEvents(accessToken) {
    if (!accessToken && !this.apiKey) return false;
    try {
      const timeMin = new Date(Date.now() - 30 * 86400000).toISOString();
      const timeMax = new Date(Date.now() + 60 * 86400000).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime${this.apiKey ? `&key=${this.apiKey}` : ''}`;
      
      const headers = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Google Calendar API returned error ' + res.status);
      const data = await res.json();
      const parsedEvents = (data.items || []).map(item => {
        const startStr = item.start?.dateTime || item.start?.date || '';
        const endStr = item.end?.dateTime || item.end?.date || '';
        const date = startStr.substring(0, 10);
        let startTime = '09:00';
        let endTime = '10:00';
        if (startStr.includes('T')) {
          startTime = startStr.substring(11, 16);
        }
        if (endStr.includes('T')) {
          endTime = endStr.substring(11, 16);
        }

        return {
          id: item.id,
          title: item.summary || 'Busy',
          date,
          startTime,
          endTime,
          description: item.description || '',
          location: item.location || '',
          isGoogle: true,
          color: '#000000',
        };
      });

      this.events = parsedEvents;
      localStorage.setItem(GCAL_EVENTS_KEY, JSON.stringify(this.events));
      this.savePref({ enabled: true });
      this.notify();
      return true;
    } catch (e) {
      console.error('Error fetching live Google Calendar events:', e);
      return false;
    }
  }
}

export const googleCalendar = new GoogleCalendarManager();
