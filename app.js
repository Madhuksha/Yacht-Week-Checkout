(function() {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  function fmtMoney(amount) {
    const { currencySymbol = '$' } = YWStorage.getSettings();
    return `${currencySymbol}${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  function renderFilters() {
    const locations = YWStorage.listLocations();
    const locationSelect = $('#locationSelect');
    locationSelect.innerHTML = locations.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    updateWeeksForLocation();
  }

  function updateWeeksForLocation() {
    const weekSelect = $('#weekSelect');
    const weeks = YWStorage.listWeeks();
    const selectedLocationId = $('#locationSelect').value;
    const loc = YWStorage.findLocationById(selectedLocationId);
    const allowedWeekIds = new Set(loc ? loc.weekIds : weeks.map(w => w.id));
    const options = weeks
      .filter(w => allowedWeekIds.has(w.id))
      .map(w => `<option value="${w.id}">Week ${w.number} - ${fmtDate(w.startDate)} → ${fmtDate(w.endDate)}</option>`)
      .join('');
    weekSelect.innerHTML = options;
  }

  function availableYachts(locationId, weekId, guests) {
    return YWStorage.listYachts().filter(y => {
      const okGuests = !guests || Number(guests) <= Number(y.berths || 0);
      const okSlot = (y.availability || []).some(a => a.locationId === locationId && a.weekId === weekId);
      return okGuests && okSlot;
    });
  }

  function renderYachts() {
    const locationId = $('#locationSelect').value;
    const weekId = $('#weekSelect').value;
    const guests = $('#guestsInput').value;
    const list = $('#results');
    const loc = YWStorage.findLocationById(locationId);
    const week = YWStorage.findWeekById(weekId);
    const yachts = availableYachts(locationId, weekId, guests);

    if (!locationId || !weekId) { list.innerHTML = '<div class="muted">Select a location and week to see available yachts.</div>'; return; }
    if (yachts.length === 0) { list.innerHTML = '<div class="muted">No yachts match your filters.</div>'; return; }

    list.innerHTML = yachts.map(y => `
      <article class="card">
        <img class="card-media" src="${y.imageUrl || 'https://images.unsplash.com/photo-1528493366314-e317cd98dd80?q=80&w=1600&auto=format&fit=crop'}" alt="${y.name}">
        <div class="card-body">
          <div class="card-title">
            <div>${y.name}</div>
            <div class="price">${fmtMoney(y.pricePerWeek)}</div>
          </div>
          <div class="muted">${loc ? loc.name : ''} • Week ${week.number}: ${fmtDate(week.startDate)} → ${fmtDate(week.endDate)}</div>
          <div class="badges">
            <span class="badge">${y.length}m</span>
            <span class="badge">${y.cabins} cabins</span>
            <span class="badge">${y.berths} berths</span>
            <span class="badge">${y.year}</span>
          </div>
          <div class="muted">${y.description || ''}</div>
          <div class="card-actions">
            <button class="btn primary" data-book data-yacht-id="${y.id}" data-location-id="${locationId}" data-week-id="${weekId}">Book now</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  function openModal() {
    const m = $('#bookingModal');
    m.classList.remove('hidden');
    m.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    const m = $('#bookingModal');
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
    $('#bookingForm').reset();
  }

  function attachEvents() {
    $('#applyFiltersBtn').addEventListener('click', renderYachts);
    $('#resetFiltersBtn').addEventListener('click', () => { renderFilters(); renderYachts(); });
    $('#locationSelect').addEventListener('change', () => { updateWeeksForLocation(); renderYachts(); });
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('[data-book]')) {
        $('#bookingYachtId').value = t.getAttribute('data-yacht-id');
        $('#bookingLocationId').value = t.getAttribute('data-location-id');
        $('#bookingWeekId').value = t.getAttribute('data-week-id');
        openModal();
      }
      if (t && t.hasAttribute('data-close-modal')) { closeModal(); }
    });

    $('#bookingForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const settings = YWStorage.getSettings();
      if (!settings.stripePaymentLink) {
        alert('Stripe Payment Link is not set. Go to Admin → Settings and add it.');
        return;
      }
      const booking = {
        id: null,
        yachtId: $('#bookingYachtId').value,
        locationId: $('#bookingLocationId').value,
        weekId: $('#bookingWeekId').value,
        customer: {
          name: $('#customerName').value.trim(),
          email: $('#customerEmail').value.trim(),
          phone: $('#customerPhone').value.trim(),
          notes: $('#customerNotes').value.trim(),
        },
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
      };
      const saved = YWStorage.saveBooking(booking);
      closeModal();
      // Redirect to Stripe Payment Link. Append a reference id if desired.
      const ref = encodeURIComponent(saved.id);
      const url = `${settings.stripePaymentLink}?client_reference_id=${ref}`;
      window.location.href = url;
    });
  }

  function init() {
    $('#year').textContent = String(new Date().getFullYear());
    renderFilters();
    renderYachts();
    attachEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

