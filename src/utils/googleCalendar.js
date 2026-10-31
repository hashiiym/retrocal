// Google Calendar API integration & mock calendar sync provider

const GCAL_CONFIG_KEY = 'retrocal_gcal_config';
const GCAL_EVENTS_KEY = 'retrocal_gcal_events';

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
    this.connected = false;
    this.enabled = true;
    this.events = [];
    this.init();
  }

  init() {
    try {
      const config = localStorage.getItem(GCAL_CONFIG_KEY);
      if (config) {
        const parsed = JSON.parse(config);
        this.connected = !!parsed.connected;
        this.enabled = parsed.enabled !== false;
      } else {
        // Pre-enable demo connection by default so user sees unified calendar immediately!
        this.connected = true;
        this.enabled = true;
        this.saveConfig({ connected: true, enabled: true, useDemo: true });
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

  getConfig() {
    try {
      const config = localStorage.getItem(GCAL_CONFIG_KEY);
      return config ? JSON.parse(config) : { connected: true, enabled: true, useDemo: true, clientId: '', apiKey: '' };
    } catch {
      return { connected: true, enabled: true, useDemo: true, clientId: '', apiKey: '' };
    }
  }

  saveConfig(updates) {
    const current = this.getConfig();
    const merged = { ...current, ...updates };
    localStorage.setItem(GCAL_CONFIG_KEY, JSON.stringify(merged));
    this.connected = merged.connected;
    this.enabled = merged.enabled;
    this.notify();
  }

  getEvents() {
    if (!this.enabled) return [];
    return this.events;
  }

  toggleEnabled() {
    this.saveConfig({ enabled: !this.enabled });
  }

  disconnect() {
    this.saveConfig({ connected: false, enabled: false });
    this.events = [];
    localStorage.removeItem(GCAL_EVENTS_KEY);
    this.notify();
  }

  connectDemoEvents() {
    this.events = generateSampleGoogleEvents();
    localStorage.setItem(GCAL_EVENTS_KEY, JSON.stringify(this.events));
    this.saveConfig({ connected: true, enabled: true, useDemo: true });
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
        this.saveConfig({ connected: true, enabled: true });
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
    if (!accessToken) return false;
    try {
      const timeMin = new Date(Date.now() - 30 * 86400000).toISOString();
      const timeMax = new Date(Date.now() + 60 * 86400000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
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
      this.saveConfig({ connected: true, enabled: true, useDemo: false });
      this.notify();
      return true;
    } catch (e) {
      console.error('Error fetching live Google Calendar events:', e);
      return false;
    }
  }
}

export const googleCalendar = new GoogleCalendarManager();
