(function() {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  function switchTab(tab) {
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  }

  // Weeks
  function renderWeeks() {
    const target = $('#weeksList');
    const weeks = YWStorage.listWeeks();
    target.innerHTML = weeks.map(w => `
      <div class="list-item">
        <div><strong>Week ${w.number}</strong> • ${fmtDate(w.startDate)} → ${fmtDate(w.endDate)}</div>
        <div class="list-actions">
          <button class="btn" data-edit-week="${w.id}">Edit</button>
          <button class="btn danger" data-delete-week="${w.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function loadWeekIntoForm(id) {
    const w = YWStorage.findWeekById(id);
    if (!w) return;
    $('#weekId').value = w.id;
    $('#weekNumber').value = w.number;
    $('#weekStart').value = w.startDate;
    $('#weekEnd').value = w.endDate;
  }

  function attachWeekHandlers() {
    $('#weekForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const w = {
        id: $('#weekId').value || null,
        number: Number($('#weekNumber').value),
        startDate: $('#weekStart').value,
        endDate: $('#weekEnd').value,
      };
      try {
        YWStorage.saveWeek(w);
        e.target.reset();
        renderWeeks();
        populateWeeksOptions();
        alert('Saved');
      } catch (err) {
        alert(err.message);
      }
    });

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.hasAttribute('data-edit-week')) loadWeekIntoForm(t.getAttribute('data-edit-week'));
      if (t && t.hasAttribute('data-delete-week')) { YWStorage.deleteWeek(t.getAttribute('data-delete-week')); renderWeeks(); populateWeeksOptions(); }
    });
  }

  // Locations
  function populateWeeksOptions() {
    const weeks = YWStorage.listWeeks();
    const sel = $('#locationWeeks');
    const aw = $('#availabilityWeeks');
    sel.innerHTML = weeks.map(w => `<option value="${w.id}">Week ${w.number} • ${fmtDate(w.startDate)}</option>`).join('');
    aw.innerHTML = sel.innerHTML;
  }

  function renderLocations() {
    const target = $('#locationsList');
    const locs = YWStorage.listLocations();
    target.innerHTML = locs.map(l => `
      <div class="list-item">
        <div><strong>${l.name}</strong> (${l.code}) • Weeks: ${l.weekIds.length}</div>
        <div class="list-actions">
          <button class="btn" data-edit-location="${l.id}">Edit</button>
          <button class="btn danger" data-delete-location="${l.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function loadLocationIntoForm(id) {
    const l = YWStorage.listLocations().find(x => x.id === id);
    if (!l) return;
    $('#locationId').value = l.id;
    $('#locationName').value = l.name;
    $('#locationCode').value = l.code;
    const weeksSel = $('#locationWeeks');
    Array.from(weeksSel.options).forEach(opt => { opt.selected = l.weekIds.includes(opt.value); });
  }

  function attachLocationHandlers() {
    $('#locationForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const selectedWeeks = Array.from($('#locationWeeks').selectedOptions).map(o => o.value);
      const loc = {
        id: $('#locationId').value || null,
        name: $('#locationName').value.trim(),
        code: $('#locationCode').value.trim(),
        weekIds: selectedWeeks
      };
      YWStorage.saveLocation(loc);
      e.target.reset();
      renderLocations();
      populateLocationsOptions();
      alert('Saved');
    });

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.hasAttribute('data-edit-location')) loadLocationIntoForm(t.getAttribute('data-edit-location'));
      if (t && t.hasAttribute('data-delete-location')) { YWStorage.deleteLocation(t.getAttribute('data-delete-location')); renderLocations(); populateLocationsOptions(); }
    });
  }

  // Yachts
  function populateLocationsOptions() {
    const locs = YWStorage.listLocations();
    const sel = $('#availabilityLocation');
    sel.innerHTML = locs.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
  }

  function currentYachtAvailabilityChips(av) {
    const weeksMap = Object.fromEntries(YWStorage.listWeeks().map(w => [w.id, w]));
    const locMap = Object.fromEntries(YWStorage.listLocations().map(l => [l.id, l]));
    return av.map((a, idx) => `
      <span class="chip" data-av-idx="${idx}">${locMap[a.locationId]?.name || 'Unknown'} • Week ${weeksMap[a.weekId]?.number || '?'}
        <button class="remove" title="Remove" data-remove-av="${idx}">×</button>
      </span>
    `).join('');
  }

  function renderYachts() {
    const target = $('#yachtsList');
    const yachts = YWStorage.listYachts();
    target.innerHTML = yachts.map(y => `
      <div class="list-item">
        <div><strong>${y.name}</strong> • ${y.length}m • ${y.cabins} cabins • ${y.berths} berths • $${y.pricePerWeek}/week</div>
        <div class="list-actions">
          <button class="btn" data-edit-yacht="${y.id}">Edit</button>
          <button class="btn danger" data-delete-yacht="${y.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  let tmpAvailability = [];

  function loadYachtIntoForm(id) {
    const y = YWStorage.findYachtById(id);
    if (!y) return;
    $('#yachtId').value = y.id;
    $('#yachtName').value = y.name;
    $('#yachtYear').value = y.year;
    $('#yachtLength').value = y.length;
    $('#yachtCabins').value = y.cabins;
    $('#yachtBerths').value = y.berths;
    $('#yachtPrice').value = y.pricePerWeek;
    $('#yachtImage').value = y.imageUrl || '';
    $('#yachtDescription').value = y.description || '';
    tmpAvailability = Array.isArray(y.availability) ? [...y.availability] : [];
    $('#yachtAvailabilityList').innerHTML = currentYachtAvailabilityChips(tmpAvailability);
  }

  function attachYachtHandlers() {
    $('#addAvailabilityBtn').addEventListener('click', () => {
      const locId = $('#availabilityLocation').value;
      const weeks = Array.from($('#availabilityWeeks').selectedOptions).map(o => o.value);
      weeks.forEach(w => { if (!tmpAvailability.some(a => a.locationId === locId && a.weekId === w)) tmpAvailability.push({ locationId: locId, weekId: w }); });
      $('#yachtAvailabilityList').innerHTML = currentYachtAvailabilityChips(tmpAvailability);
    });

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.hasAttribute('data-remove-av')) { const idx = Number(t.getAttribute('data-remove-av')); tmpAvailability.splice(idx,1); $('#yachtAvailabilityList').innerHTML = currentYachtAvailabilityChips(tmpAvailability); }
      if (t && t.hasAttribute('data-edit-yacht')) loadYachtIntoForm(t.getAttribute('data-edit-yacht'));
      if (t && t.hasAttribute('data-delete-yacht')) { YWStorage.deleteYacht(t.getAttribute('data-delete-yacht')); renderYachts(); }
    });

    $('#yachtForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const y = {
        id: $('#yachtId').value || null,
        name: $('#yachtName').value.trim(),
        year: Number($('#yachtYear').value),
        length: Number($('#yachtLength').value),
        cabins: Number($('#yachtCabins').value),
        berths: Number($('#yachtBerths').value),
        pricePerWeek: Number($('#yachtPrice').value),
        imageUrl: $('#yachtImage').value.trim(),
        description: $('#yachtDescription').value.trim(),
        availability: tmpAvailability
      };
      YWStorage.saveYacht(y);
      tmpAvailability = [];
      $('#yachtAvailabilityList').innerHTML = '';
      e.target.reset();
      renderYachts();
      alert('Saved');
    });
  }

  // Bookings
  function renderBookings() {
    const target = $('#bookingsList');
    const statusFilter = $('#bookingStatusFilter').value;
    const list = YWStorage.listBookings().filter(b => !statusFilter || b.status === statusFilter);
    const locMap = Object.fromEntries(YWStorage.listLocations().map(l => [l.id, l]));
    const wkMap = Object.fromEntries(YWStorage.listWeeks().map(w => [w.id, w]));
    const yMap = Object.fromEntries(YWStorage.listYachts().map(y => [y.id, y]));
    target.innerHTML = list.map(b => `
      <div class="list-item">
        <div>
          <div><strong>${yMap[b.yachtId]?.name || 'Yacht'}</strong> • ${locMap[b.locationId]?.name || ''} • Week ${wkMap[b.weekId]?.number || ''}</div>
          <div class="muted">${b.customer?.name || ''} • ${b.customer?.email || ''} • ${new Date(b.createdAt).toLocaleString()}</div>
          <div class="badges"><span class="badge">${b.status}</span></div>
        </div>
        <div class="list-actions">
          <button class="btn" data-mark-status="paid" data-bid="${b.id}">Mark paid</button>
          <button class="btn" data-mark-status="cancelled" data-bid="${b.id}">Cancel</button>
          <button class="btn danger" data-delete-booking="${b.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function attachBookingHandlers() {
    $('#bookingStatusFilter').addEventListener('change', renderBookings);
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.hasAttribute('data-delete-booking')) { YWStorage.deleteBooking(t.getAttribute('data-delete-booking')); renderBookings(); }
      if (t && t.hasAttribute('data-mark-status')) {
        const id = t.getAttribute('data-bid');
        const status = t.getAttribute('data-mark-status');
        const list = YWStorage.listBookings();
        const i = list.findIndex(x => x.id === id);
        if (i >= 0) { list[i].status = status; localStorage.setItem('yw_bookings', JSON.stringify(list)); renderBookings(); }
      }
    });
  }

  // Settings
  function renderSettings() {
    const s = YWStorage.getSettings();
    $('#currencySymbol').value = s.currencySymbol || '$';
    $('#stripePaymentLink').value = s.stripePaymentLink || '';
  }

  function attachSettingsHandlers() {
    $('#settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      YWStorage.saveSettings({
        currencySymbol: $('#currencySymbol').value.trim() || '$',
        stripePaymentLink: $('#stripePaymentLink').value.trim()
      });
      alert('Settings saved');
    });
  }

  function attachTabs() {
    $$('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.getAttribute('data-tab'))));
  }

  function init() {
    $('#year').textContent = String(new Date().getFullYear());
    attachTabs();

    // Weeks
    renderWeeks();
    attachWeekHandlers();

    // Locations
    populateWeeksOptions();
    renderLocations();
    attachLocationHandlers();

    // Yachts
    populateLocationsOptions();
    attachYachtHandlers();
    renderYachts();

    // Bookings
    attachBookingHandlers();
    renderBookings();

    // Settings
    renderSettings();
    attachSettingsHandlers();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

