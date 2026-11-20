;(() => {
  const courses = {
    lmv: { name: 'LMV — Car Driving', fee: 11000 },
    mcwg: { name: 'MCWG — Geared Motorcycle', fee: 8000 },
    mcwog: { name: 'MCWOG — Scooter Training', fee: 6000 },
  };
  const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  const branches = JSON.parse(document.getElementById('sms-branch-data')?.textContent || '[]');
  const branchFor = id => branches.find(branch => branch.id === id) || branches[0];
  const whatsapp = (message, branchId) => 'https://wa.me/' + (branchFor(branchId)?.phone || '919846024345') + '?text=' + encodeURIComponent(message);
  const finder = document.getElementById('sms-course-finder');
  if (finder) {
    function updateEstimate() {
      const course = courses[finder.elements.course.value];
      const registration = finder.elements.registration.checked;
      const total = course.fee + (registration ? 2000 : 0);
      const branch = branchFor(finder.elements.branch?.value);
      document.getElementById('sms-estimate').value = money(total);
      document.getElementById('sms-estimate-breakdown').textContent = `${course.name} ${money(course.fee)} · ${registration ? 'LL Fee & Registration ₹2,000' : 'Registration not selected'}`;
      document.getElementById('sms-finder-enquire').href = whatsapp(`Hi SMS Motor Driving School, I am interested in ${course.name} at the ${branch?.name || 'Vanchiyoor'} branch. The website estimate is ${money(total)}${registration ? ', including ₹2,000 LL Fee & Registration' : ', without LL Fee & Registration'}. Please confirm the branch address, inclusions, lesson duration and available timings.`, branch?.id);
    }
    finder.addEventListener('change', updateEstimate);
    finder.addEventListener('submit', event => event.preventDefault());
    document.querySelectorAll('[data-select-course]').forEach(link => {
      link.addEventListener('click', () => {
        const selected = link.dataset.selectCourse;
        if (selected === 'registration') finder.elements.registration.checked = true;
        else finder.elements.course.value = selected;
        updateEstimate();
      });
    });
    updateEstimate();
  }
  const topics = {
    lmv: [['FOUNDATIONS','Know your car','Seating position, mirrors, controls and pre-drive checks.'],['CONTROL','Find your rhythm','Smooth starts, clutch control, gear changes and braking.'],['ROAD AWARENESS','Read the road','Observation, signals, junctions and sharing road space.'],['PRACTICE','Manoeuvre with care','Reversing, parking and identifying what needs more practice.']],
    mcwg: [['FOUNDATIONS','Get comfortable','Riding position, controls and checks before starting.'],['BALANCE','Build steady control','Low-speed balance, smooth starts and controlled stops.'],['GEARS','Coordinate your inputs','Clutch, throttle and gear changes with progressive braking.'],['ROAD AWARENESS','Look ahead','Observation, signals, safe turns and space around other vehicles.']],
    mcwog: [['FOUNDATIONS','Know your scooter','Controls, riding position and pre-ride checks.'],['BALANCE','Start smoothly','Balance, throttle control and low-speed practice.'],['CONTROL','Stop with confidence','Progressive braking, controlled turns and safe stopping.'],['ROAD AWARENESS','Make space for safety','Observation, signalling, junctions and road positioning.']],
  };
  const tabs = [...document.querySelectorAll('[data-topic]')];
  function selectTopic(tab) {
    tabs.forEach(item => { const active = item === tab; item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1; });
    const panel = document.getElementById('topic-panel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.innerHTML = '<div class="sms-topic-grid">' + topics[tab.dataset.topic].map(([label,title,copy]) => `<article><span>${label}</span><h3>${title}</h3><p>${copy}</p></article>`).join('') + '</div>';
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTopic(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); tabs[next].focus(); selectTopic(tabs[next]); }
    });
  });
  const enquiry = document.getElementById('sms-whatsapp-form');
  enquiry?.addEventListener('submit', event => {
    event.preventDefault();
    if (!enquiry.reportValidity()) return;
    const values = new FormData(enquiry);
    const branch = branchFor(values.get('branch'));
    const message = `Hi SMS Motor Driving School, my name is ${String(values.get('name')).trim()}. I am interested in ${values.get('course')} at the ${branch?.name || 'Vanchiyoor'} branch.` + (values.get('timing') ? ` Preferred timings: ${String(values.get('timing')).trim()}.` : '') + (values.get('message') ? `\n${String(values.get('message')).trim()}` : '') + '\nPlease confirm the branch address, availability and course details.';
    const link = document.getElementById('sms-whatsapp-ready');
    link.href = whatsapp(message, branch?.id);
    link.hidden = false;
    link.focus();
  });
  enquiry?.addEventListener('input', () => { document.getElementById('sms-whatsapp-ready').hidden = true; });
  enquiry?.addEventListener('change', () => { document.getElementById('sms-whatsapp-ready').hidden = true; });
  const locationBranch = document.getElementById('sms-location-branch');
  function updateLocation() {
    const branch = branchFor(locationBranch?.value);
    if (!branch) return;
    document.getElementById('sms-location-name').textContent = branch.name;
    document.getElementById('sms-location-address').textContent = branch.address || 'Contact the Vanchiyoor main office for the Manacaud branch address and direct number before visiting.';
    const phone = document.getElementById('sms-location-phone');
    phone.href = 'tel:+' + branch.phone;
    phone.textContent = branch.displayPhone + (branch.contactVia ? ' · Main office' : '');
    const map = document.getElementById('sms-location-map');
    map.href = branch.mapQuery ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(branch.mapQuery) : 'tel:+' + branch.phone;
    map.textContent = branch.mapQuery ? 'View on Google Maps' : 'Ask for branch details';
    if (branch.mapQuery) { map.target = '_blank'; map.rel = 'noopener noreferrer'; }
    else { map.removeAttribute('target'); }
  }
  document.querySelectorAll('.sms-branch-select').forEach(select => {
    select.addEventListener('change', () => {
      document.querySelectorAll('.sms-branch-select').forEach(other => { other.value = select.value; });
      finder?.dispatchEvent(new Event('change'));
      if (enquiry) document.getElementById('sms-whatsapp-ready').hidden = true;
      updateLocation();
    });
  });
  updateLocation();
  const dock = document.createElement('nav');
  dock.className = 'sms-contact-dock';
  dock.setAttribute('aria-label', 'Quick contact');
  dock.innerHTML = `<a href="/#sms-branches">Find a branch</a><a href="${whatsapp('Hi SMS Motor Driving School, I would like to enquire about driving lessons and my nearest branch.')}" target="_blank" rel="noopener noreferrer">WhatsApp us</a>`;
  document.body.append(dock);
  // Keep the floating controls out of modal focus and interaction flows.
  const syncDock = () => { dock.hidden = document.body.classList.contains('modal-open'); dock.style.display = dock.hidden ? 'none' : ''; };
  new MutationObserver(syncDock).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const skip = document.createElement('a');
  skip.className = 'sms-skip-link'; skip.href = '#our-programs'; skip.textContent = 'Skip to programs'; document.body.prepend(skip);
})();
