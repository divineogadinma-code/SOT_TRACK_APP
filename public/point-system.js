document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // --- Get all form and input elements ---
    const eggCollectionForm = document.getElementById('egg-collection-form');
    const totalCratesInput = document.getElementById('total-crates');
    const pointsPerCrateDisplay = document.getElementById('points-per-crate');
    const workerCratesInput = document.getElementById('worker-crates');
    const eggWorkerSelect = document.getElementById('egg-worker-select');

    const bonusForm = document.getElementById('bonus-form');
    const bonusWorkerSelect = document.getElementById('bonus-worker-select');
    const bonusTypeSelect = document.getElementById('bonus-type-select');

    const conversionForm = document.getElementById('conversion-form');
    const conversionWorkerSelect = document.getElementById('conversion-worker-select');
    const monthSelect = document.getElementById('month-select');
    const conversionResultDiv = document.getElementById('conversion-result');
    const resultText = document.getElementById('result-text');
    const settingsForm = document.getElementById('settings-form');
const dailyMaxInput = document.getElementById('daily-max-points');
const monthlyMaxInput = document.getElementById('monthly-max-points');
const conversionRateInput = document.getElementById('conversion-rate');
const attendanceBonusInput = document.getElementById('attendance-bonus');
const innovationBonusInput = document.getElementById('innovation-bonus');
const eggMaxInput = document.getElementById('egg-max-points');
const eggRateInput = document.getElementById('egg-rate');

    let pointSettings = {}; // To store settings like max points, bonus values, etc.

    // --- Main initialization function ---
    const initialize = async () => {
        showLoader();
        try {
            await Promise.all([
                fetchPointSettings(),
                populateWorkerDropdowns()
            ]);
            loadSettingsIntoForm();
        } catch (error) {
            showToast('Failed to load initial page data.', 'error');
        } finally {
            hideLoader();
        }
    };

    // --- Data Fetching Functions ---
    const fetchPointSettings = async () => {
        const response = await fetch('/api/point-settings', { headers: authHeaders });
        if (response.ok) {
            pointSettings = await response.json();
        }
    };

    const populateWorkerDropdowns = async () => {
        const response = await fetch('/api/workers', { headers: authHeaders });
        const workers = await response.json();
        
        const workerOptions = workers
            .filter(w => w.role !== 'admin')
            .map(w => `<option value="${w._id}">${w.name}</option>`)
            .join('');

        eggWorkerSelect.innerHTML = `<option value="" disabled selected>Select worker...</option>${workerOptions}`;
        bonusWorkerSelect.innerHTML = `<option value="" disabled selected>Select worker...</option>${workerOptions}`;
        conversionWorkerSelect.innerHTML = `<option value="" disabled selected>Select worker...</option>${workerOptions}`;
    };

    // --- Section 1: Egg Collection Logic ---
    totalCratesInput.addEventListener('input', () => {
        const totalCrates = parseInt(totalCratesInput.value, 10);
        if (totalCrates > 0 && pointSettings.eggCollectionMaxPoints) {
            const pointsPerCrate = pointSettings.eggCollectionMaxPoints / totalCrates;
            pointsPerCrateDisplay.value = pointsPerCrate.toFixed(2);
        } else {
            pointsPerCrateDisplay.value = '';
        }
    });

    eggCollectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        try {
            const workerId = eggWorkerSelect.value;
            const pointsPerCrate = parseFloat(pointsPerCrateDisplay.value);
            const workerCrates = parseInt(workerCratesInput.value, 10);

            if (!workerId || isNaN(pointsPerCrate) || isNaN(workerCrates)) {
                throw new Error('Please fill all fields correctly.');
            }

            const pointsToAward = Math.round(workerCrates * pointsPerCrate);

            // 🔒 Ensure it never exceeds the admin’s max
    if (pointsToAward > pointSettings.eggCollectionMaxPoints) {
      pointsToAward = pointSettings.eggCollectionMaxPoints;
    }
            
            // This re-uses the existing 'log task' functionality
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    workerId,
                    taskName: `Egg Collection (${workerCrates} crates)`,
                    points: pointsToAward
                })
            });

            if (!response.ok) throw new Error((await response.json()).message);
            
            showToast(`Awarded ${pointsToAward} points successfully!`, 'success');
            eggCollectionForm.reset();
            pointsPerCrateDisplay.value = '';

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            hideLoader();
        }
    });

    // --- Section 2: Bonus System Logic ---
    bonusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        try {
            const workerId = bonusWorkerSelect.value;
            const bonusType = bonusTypeSelect.value;
            
            let points = 0;
            if (bonusType === 'Perfect Attendance') {
                points = pointSettings.perfectAttendanceBonus;
            } else if (bonusType === 'Innovation & Suggestion') {
                points = pointSettings.innovationBonus;
            }

            if (!workerId || !bonusType || points === 0) {
                throw new Error('Please select a worker and a bonus type.');
            }

            const response = await fetch('/api/bonuses', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ workerId, bonusType, points })
            });
            
            if (!response.ok) throw new Error((await response.json()).message);

            showToast('Bonus awarded successfully!', 'success');
            bonusForm.reset();

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            hideLoader();
        }
    });

    // --- Section 3: Monthly Conversion Logic ---
    conversionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        conversionResultDiv.classList.add('d-none');
        try {
            const workerId = conversionWorkerSelect.value;
            const [year, month] = monthSelect.value.split('-'); // "2025-08" -> ["2025", "08"]

            if (!workerId || !month || !year) {
                throw new Error('Please select a worker and a month.');
            }

            const response = await fetch(`/api/monthly-summary/${workerId}?year=${year}&month=${parseInt(month) - 1}`, { headers: authHeaders });
            if (!response.ok) throw new Error((await response.json()).message);
            
            const summary = await response.json();
            resultText.innerHTML = `Total for <strong>${summary.month} ${summary.year}</strong>: <strong>${summary.totalPoints} points</strong> = <strong>${summary.monetaryValue} Naira</strong>`;
            conversionResultDiv.classList.remove('d-none');

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            hideLoader();
        }
    });
    // Populate form with current settings
const loadSettingsIntoForm = () => {
  if (pointSettings) {
    dailyMaxInput.value = pointSettings.dailyMaxPoints || 0;
    monthlyMaxInput.value = pointSettings.monthlyMaxPoints || 0;
    conversionRateInput.value = pointSettings.conversionRate || 7;
    attendanceBonusInput.value = pointSettings.perfectAttendanceBonus || 0;
    innovationBonusInput.value = pointSettings.innovationBonus || 0;
    eggMaxInput.value = pointSettings.eggCollectionMaxPoints || 100;
    
  }
};

// Save new settings
settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoader();
  try {
    const body = {
      dailyMaxPoints: parseInt(dailyMaxInput.value, 10),
      monthlyMaxPoints: parseInt(monthlyMaxInput.value, 10),
      conversionRate: parseFloat(conversionRateInput.value),
      perfectAttendanceBonus: parseInt(attendanceBonusInput.value, 10),
      innovationBonus: parseInt(innovationBonusInput.value, 10),
       eggCollectionMaxPoints: parseInt(eggMaxInput.value, 10)
    };

    const response = await fetch('/api/point-settings', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error((await response.json()).message);

    const result = await response.json();
    pointSettings = result.settings; // update cache
    showToast('Settings updated successfully!', 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    hideLoader();
  }
});


    initialize();
    
});
