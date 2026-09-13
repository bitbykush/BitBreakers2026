const SAMPLE_CITIZEN_PROFILE = {
  name: "Ramesh Kumar Sharma",
  father_name: "Ram Prasad Sharma",
  fatherHusbandName: "Ram Prasad Sharma",
  mother_name: "Sita Devi Sharma",
  dob: "1992-05-14",
  gender: "Male",
  category: "OBC",
  socialCategory: "OBC",
  annualIncome: 180000,
  annual_income: 180000,
  state: "Maharashtra",
  district: "Pune",
  block: "Haveli",
  pincode: "411001",
  address: "Flat 204, Shanti Nagar, Near Shivaji Chowk, Haveli, Pune",
  areaType: "Rural",
  area_type: "Rural",
  education: "10th Pass",
  profession: "Agro Processing & Food Products",
  trade_or_activity: "Agro Processing & Food Products",
  requiredCapital: 500000,
  required_capital: 500000,
  own_contribution: 25000,
  panNumber: "ABCDE1234F",
  pan_number: "ABCDE1234F",
  mobileNumber: "9876543210",
  mobile_number: "9876543210",
  email: "ramesh.sharma92@gmail.com",
  bank_name: "State Bank of India",
  bank_branch: "Pune Main Branch",
  bank_account_no: "309812739182",
  bank_ifsc: "SBIN0001234",
  is_differently_abled: false,
  is_ex_serviceman: false,
  maskedAadhaar: "XXXX-XXXX-4589"
};

function renderProfile(p) {
  const nameEl = document.getElementById('prof-name');
  const detailsEl = document.getElementById('prof-details');
  const badgeContainer = document.getElementById('prof-badge-container');

  const hasData = p && Boolean(p.name && p.name.trim().length > 0);

  if (hasData) {
    nameEl.innerText = p.name;
    const inc = p.annualIncome || p.annual_income;
    const cat = p.category || p.socialCategory || 'General';
    const loc = [p.district, p.state].filter(Boolean).join(', ');
    const trade = p.trade_or_activity || p.profession || 'Self-Employed';
    const incText = inc ? ` • ₹${Number(inc).toLocaleString('en-IN')}/yr` : '';
    const locText = loc ? ` • ${loc}` : '';

    detailsEl.innerText = `${cat}${incText} • ${trade}${locText}`;
    badgeContainer.innerHTML = `<span class="badge-synced">✓ Profile Active (${p.mobileNumber || p.mobile_number || 'Ready'})</span>`;
  } else {
    nameEl.innerText = 'No Active Profile';
    detailsEl.innerText = 'Chrome storage does not have citizen details yet.';
    badgeContainer.innerHTML = `<span class="badge-empty">⚠️ Storage Empty — Click "Load Demo Profile"</span>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Load saved profile if available
  chrome.storage.local.get(['udyamsetu_shared_profile', 'sugam_seva_profile', 'seva_kendra_profile'], (res) => {
    const p = res.udyamsetu_shared_profile || res.sugam_seva_profile || res.seva_kendra_profile;
    renderProfile(p);
  });

  // Primary: Trigger Auto-Fill on open portal tab
  document.getElementById('btn-trigger').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content_script.js']
      });
      window.close();
    }
  });

  // Load Demo Citizen Profile
  document.getElementById('btn-load-demo').addEventListener('click', () => {
    chrome.storage.local.set({ udyamsetu_shared_profile: SAMPLE_CITIZEN_PROFILE }, () => {
      renderProfile(SAMPLE_CITIZEN_PROFILE);
      const status = document.getElementById('status-msg');
      status.innerText = '✓ Complete Demo Citizen Profile Loaded!';
      status.style.color = '#10b981';
      setTimeout(() => { status.innerText = ''; }, 3000);
    });
  });

  // Refresh Sync from localhost Tab
  document.getElementById('btn-refresh-sync').addEventListener('click', async () => {
    const status = document.getElementById('status-msg');
    status.innerText = 'Searching open Scheme Seva Kendra tabs...';
    status.style.color = '#38bdf8';

    try {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && (t.url.includes('localhost') || t.url.includes('127.0.0.1')));

      if (targetTab && targetTab.id) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          func: () => {
            try {
              const raw = localStorage.getItem('udyamsetu_applicant_profile');
              return raw ? JSON.parse(raw) : null;
            } catch (e) {
              return null;
            }
          }
        });

        if (results && results[0] && results[0].result) {
          const synced = results[0].result;
          chrome.storage.local.set({ udyamsetu_shared_profile: synced }, () => {
            renderProfile(synced);
            status.innerText = `✓ Synced: ${synced.name || 'Citizen'}`;
            status.style.color = '#10b981';
          });
          return;
        }
      }

      status.innerText = 'No active Scheme Seva Kendra tab found. Use Demo button.';
      status.style.color = '#f59e0b';
    } catch (e) {
      status.innerText = 'Sync failed. Use Demo button to populate.';
      status.style.color = '#ef4444';
    }
  });
});
