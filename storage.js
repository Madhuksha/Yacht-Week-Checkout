(function() {
  const STORAGE_KEYS = {
    weeks: 'yw_weeks',
    locations: 'yw_locations',
    yachts: 'yw_yachts',
    bookings: 'yw_bookings',
    settings: 'yw_settings'
  };

  function readArray(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to read key', key, e);
      return [];
    }
  }

  function writeArray(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function readObject(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Failed to read key', key, e);
      return {};
    }
  }

  function writeObject(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }

  function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function isSaturday(dateStr) {
    const d = new Date(dateStr);
    return d.getDay() === 6; // Saturday
  }

  function diffDays(a, b) {
    const ms = Math.abs(new Date(b).setHours(0,0,0,0) - new Date(a).setHours(0,0,0,0));
    return Math.round(ms / (1000*60*60*24));
  }

  const api = {
    // Weeks
    listWeeks() { return readArray(STORAGE_KEYS.weeks).sort((a,b) => a.number - b.number); },
    saveWeek(week) {
      if (!isSaturday(week.startDate) || !isSaturday(week.endDate)) {
        throw new Error('Start and end dates must be Saturdays');
      }
      if (diffDays(week.startDate, week.endDate) !== 7) {
        throw new Error('Week must be exactly Saturday to Saturday (7 nights)');
      }
      const weeks = readArray(STORAGE_KEYS.weeks);
      if (!week.id) { week.id = generateId('week'); weeks.push(week); }
      else { const i = weeks.findIndex(w => w.id === week.id); if (i >= 0) weeks[i] = week; else weeks.push(week); }
      writeArray(STORAGE_KEYS.weeks, weeks);
      return week;
    },
    deleteWeek(id) {
      const weeks = readArray(STORAGE_KEYS.weeks).filter(w => w.id !== id);
      writeArray(STORAGE_KEYS.weeks, weeks);
    },

    // Locations
    listLocations() { return readArray(STORAGE_KEYS.locations); },
    saveLocation(loc) {
      const locations = readArray(STORAGE_KEYS.locations);
      if (!loc.id) { loc.id = generateId('loc'); locations.push(loc); }
      else { const i = locations.findIndex(x => x.id === loc.id); if (i >= 0) locations[i] = loc; else locations.push(loc); }
      writeArray(STORAGE_KEYS.locations, locations);
      return loc;
    },
    deleteLocation(id) {
      const locations = readArray(STORAGE_KEYS.locations).filter(x => x.id !== id);
      writeArray(STORAGE_KEYS.locations, locations);
    },

    // Yachts
    listYachts() { return readArray(STORAGE_KEYS.yachts); },
    saveYacht(yacht) {
      const yachts = readArray(STORAGE_KEYS.yachts);
      if (!yacht.id) { yacht.id = generateId('yacht'); yachts.push(yacht); }
      else { const i = yachts.findIndex(y => y.id === yacht.id); if (i >= 0) yachts[i] = yacht; else yachts.push(yacht); }
      writeArray(STORAGE_KEYS.yachts, yachts);
      return yacht;
    },
    deleteYacht(id) {
      const yachts = readArray(STORAGE_KEYS.yachts).filter(y => y.id !== id);
      writeArray(STORAGE_KEYS.yachts, yachts);
    },

    // Bookings
    listBookings() { return readArray(STORAGE_KEYS.bookings).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); },
    saveBooking(booking) {
      const bookings = readArray(STORAGE_KEYS.bookings);
      if (!booking.id) { booking.id = generateId('bk'); bookings.push(booking); }
      else { const i = bookings.findIndex(b => b.id === booking.id); if (i >= 0) bookings[i] = booking; else bookings.push(booking); }
      writeArray(STORAGE_KEYS.bookings, bookings);
      return booking;
    },
    deleteBooking(id) {
      const bookings = readArray(STORAGE_KEYS.bookings).filter(b => b.id !== id);
      writeArray(STORAGE_KEYS.bookings, bookings);
    },

    // Settings
    getSettings() { return readObject(STORAGE_KEYS.settings); },
    saveSettings(s) { writeObject(STORAGE_KEYS.settings, s); return s; },

    // Helpers
    findLocationById(id) { return this.listLocations().find(x => x.id === id); },
    findWeekById(id) { return this.listWeeks().find(w => w.id === id); },
    findYachtById(id) { return this.listYachts().find(y => y.id === id); },
  };

  // Seed data for first run
  function seedIfEmpty() {
    const weeks = readArray(STORAGE_KEYS.weeks);
    const locations = readArray(STORAGE_KEYS.locations);
    const yachts = readArray(STORAGE_KEYS.yachts);
    const settings = readObject(STORAGE_KEYS.settings);

    if (!settings.currencySymbol) {
      writeObject(STORAGE_KEYS.settings, { currencySymbol: '$', stripePaymentLink: '' });
    }

    if (weeks.length === 0) {
      // Example: first 4 Saturdays of current year
      const year = new Date().getFullYear();
      function firstSaturdayOfYear(y) {
        const d = new Date(y, 0, 1);
        const day = d.getDay();
        const diff = (6 - day + 7) % 7; // to Saturday
        d.setDate(d.getDate() + diff);
        return d;
      }
      const start = firstSaturdayOfYear(year);
      const tempWeeks = [];
      for (let i = 0; i < 6; i++) {
        const s = new Date(start);
        s.setDate(s.getDate() + i * 7);
        const e = new Date(s);
        e.setDate(e.getDate() + 7);
        tempWeeks.push({ id: generateId('week'), number: i + 1, startDate: s.toISOString().slice(0,10), endDate: e.toISOString().slice(0,10) });
      }
      writeArray(STORAGE_KEYS.weeks, tempWeeks);
    }

    if (locations.length === 0) {
      const allWeeks = readArray(STORAGE_KEYS.weeks);
      const croatia = { id: generateId('loc'), name: 'Split, Croatia', code: 'SPU', weekIds: allWeeks.slice(0,4).map(w => w.id) };
      const greece = { id: generateId('loc'), name: 'Athens, Greece', code: 'ATH', weekIds: allWeeks.slice(2,6).map(w => w.id) };
      writeArray(STORAGE_KEYS.locations, [croatia, greece]);
    }

    if (yachts.length === 0) {
      const [w1, w2] = readArray(STORAGE_KEYS.weeks);
      const [loc1, loc2] = readArray(STORAGE_KEYS.locations);
      const demoYachts = [
        {
          id: generateId('yacht'),
          name: 'Lagoon 42',
          year: 2020,
          length: 12.8,
          cabins: 4,
          berths: 8,
          pricePerWeek: 4500,
          imageUrl: 'https://images.unsplash.com/photo-1604335399105-5e7b809f44a0?q=80&w=1600&auto=format&fit=crop',
          description: 'Comfortable catamaran with spacious deck and modern amenities.',
          availability: [
            { locationId: loc1.id, weekId: w1.id },
            { locationId: loc1.id, weekId: w2.id }
          ]
        },
        {
          id: generateId('yacht'),
          name: 'Bavaria 45',
          year: 2018,
          length: 14.2,
          cabins: 4,
          berths: 8,
          pricePerWeek: 3800,
          imageUrl: 'https://images.unsplash.com/photo-1528493366314-e317cd98dd80?q=80&w=1600&auto=format&fit=crop',
          description: 'Reliable monohull, perfect for friends and family trips.',
          availability: [
            { locationId: loc2.id, weekId: w2.id }
          ]
        }
      ];
      writeArray(STORAGE_KEYS.yachts, demoYachts);
    }
  }

  seedIfEmpty();

  // Expose
  window.YWStorage = api;
  window.YWUtils = { generateId, isSaturday, diffDays };
})();

