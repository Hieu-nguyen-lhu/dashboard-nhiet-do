document.addEventListener('DOMContentLoaded', () => {
  // --- Initialize Icons ---
  lucide.createIcons();

  // --- DOM Elements ---
  const timeDisplay = document.getElementById('time-display');
  const soundSwitch = document.getElementById('sound-switch');
  const soundIcon = document.getElementById('sound-icon');
  const alarmSound = document.getElementById('alarm-sound');
  const connectionStatus = document.getElementById('connection-status');
  const connectionText = document.getElementById('connection-text');

  // Stats Card Elements
  const tempVal = document.getElementById('temp-val');
  const tempMinLbl = document.getElementById('temp-min-lbl');
  const tempMaxLbl = document.getElementById('temp-max-lbl');
  const cardTemp = document.getElementById('card-temp');

  const humidityVal = document.getElementById('humidity-val');
  const humidityMinLbl = document.getElementById('humidity-min-lbl');
  const humidityMaxLbl = document.getElementById('humidity-max-lbl');
  const cardHumidity = document.getElementById('card-humidity');

  const doorVal = document.getElementById('door-val');
  const doorTimer = document.getElementById('door-timer');
  const doorBadge = document.getElementById('door-badge');
  const doorIcon = document.getElementById('door-icon');
  const cardDoor = document.getElementById('card-door');

  const powerVal = document.getElementById('power-val');
  const currentVal = document.getElementById('current-val');
  const efficiencyVal = document.getElementById('efficiency-val');
  const energyVal = document.getElementById('energy-val');
  const cardPower = document.getElementById('card-power');

  const buzzerVal = document.getElementById('buzzer-val');
  const buzzerBadge = document.getElementById('buzzer-badge');
  const buzzerIcon = document.getElementById('buzzer-icon');
  const cardAlarm = document.getElementById('card-alarm');
  const btnMuteBuzzer = document.getElementById('btn-mute-buzzer');

  // Active Alerts Banner Area
  const activeAlertsContainer = document.getElementById('active-alerts-container');

  // Safety Threshold Slider Elements
  const threshTempMax = document.getElementById('thresh-temp-max');
  const threshTempMaxVal = document.getElementById('thresh-temp-max-val');
  const threshTempMin = document.getElementById('thresh-temp-min');
  const threshTempMinVal = document.getElementById('thresh-temp-min-val');
  const threshHumMax = document.getElementById('thresh-hum-max');
  const threshHumMaxVal = document.getElementById('thresh-hum-max-val');
  const threshHumMin = document.getElementById('thresh-hum-min');
  const threshHumMinVal = document.getElementById('thresh-hum-min-val');
  const btnSaveThresholds = document.getElementById('btn-save-thresholds');

  // Simulation Controls Elements
  const simTemp = document.getElementById('sim-temp');
  const simTempVal = document.getElementById('sim-temp-val');
  const simHum = document.getElementById('sim-hum');
  const simHumVal = document.getElementById('sim-hum-val');
  const simCurrent = document.getElementById('sim-current');
  const simCurrentVal = document.getElementById('sim-current-val');
  const simBtnDoor = document.getElementById('sim-btn-door');
  const simBtnAuto = document.getElementById('sim-btn-auto');

  // Real Device Settings Elements
  const esp32Ip = document.getElementById('esp32-ip');
  const btnConnectReal = document.getElementById('btn-connect-real');
  const realConnStatus = document.getElementById('real-conn-status');
  const realPollRate = document.getElementById('real-poll-rate');

  // Panel Tabs Buttons
  const tabBtnSim = document.getElementById('tab-btn-sim');
  const tabBtnReal = document.getElementById('tab-btn-real');
  const tabContentSim = document.getElementById('tab-content-sim');
  const tabContentReal = document.getElementById('tab-content-real');

  const tabBtnCode = document.getElementById('tab-btn-code');
  const tabBtnApi = document.getElementById('tab-btn-api');
  const tabContentCode = document.getElementById('tab-content-code');
  const tabContentApi = document.getElementById('tab-content-api');

  // General Buttons
  const btnClearLogs = document.getElementById('btn-clear-logs');
  const btnChartDhtClear = document.getElementById('btn-chart-dht-clear');
  const btnChartPowerClear = document.getElementById('btn-chart-power-clear');
  const alertLogTbody = document.getElementById('alert-log-tbody');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const esp32CodeBlock = document.getElementById('esp32-code-block');

  // --- State Variables ---
  let isSimulated = true;
  let autoDriftActive = true;
  let soundEnabled = true;
  let isMutedManually = false;

  let state = {
    temp: 2.4,
    hum: 62,
    door: 0, // 0: Closed, 1: Open
    current: 0.05, // A
    power: 11.0, // W
    energy: 0.0001, // kWh (cumulative)
    efficiency: 94, // %
    buzzer: 0 // 0: Off, 1: On
  };

  let thresholds = {
    tempMin: -2.0,
    tempMax: 8.0,
    humMin: 40.0,
    humMax: 85.0
  };

  // Timers and intervals
  let doorOpenTimer = null;
  let doorOpenSeconds = 0;
  let autoDriftInterval = null;
  let realDeviceInterval = null;
  let lastEnergyUpdateTime = Date.now();

  // Active alarms track (to manage còi báo động)
  let activeAlarms = {
    tempHigh: false,
    tempLow: false,
    humHigh: false,
    humLow: false,
    doorOpenTooLong: false
  };

  // --- Load Local Settings ---
  function loadSettings() {
    const saved = localStorage.getItem('food_storage_thresholds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        thresholds = { ...thresholds, ...parsed };

        // Update slider values
        threshTempMax.value = thresholds.tempMax;
        threshTempMin.value = thresholds.tempMin;
        threshHumMax.value = thresholds.humMax;
        threshHumMin.value = thresholds.humMin;

        // Update UI Labels
        threshTempMaxVal.textContent = `${thresholds.tempMax.toFixed(1)} °C`;
        threshTempMinVal.textContent = `${thresholds.tempMin.toFixed(1)} °C`;
        threshHumMaxVal.textContent = `${thresholds.humMax} %`;
        threshHumMinVal.textContent = `${thresholds.humMin} %`;
      } catch (e) {
        console.error('Error loading thresholds from localStorage', e);
      }
    }

    // Set labels on stat cards
    tempMinLbl.textContent = thresholds.tempMin.toFixed(1);
    tempMaxLbl.textContent = thresholds.tempMax.toFixed(1);
    humidityMinLbl.textContent = thresholds.humMin;
    humidityMaxLbl.textContent = thresholds.humMax;
  }

  // --- Clock Updater ---
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();

    timeDisplay.textContent = `${hh}:${mm}:${ss} | ${dd}/${mo}/${yyyy}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- Sound Alert System ---
  function updateAlarmAudio() {
    const isAlarming = Object.values(activeAlarms).some(v => v === true);

    if (isAlarming && state.buzzer === 1 && soundEnabled && !isMutedManually) {
      if (alarmSound.paused) {
        alarmSound.play().catch(e => console.log("Audio play blocked by browser. Interact with page first.", e));
      }
    } else {
      alarmSound.pause();
    }
  }

  soundSwitch.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    if (soundEnabled) {
      soundIcon.className = "sound-indicator text-primary";
      soundIcon.setAttribute('data-lucide', 'volume-2');
      isMutedManually = false; // Reset manual mute when toggled on
    } else {
      soundIcon.className = "sound-indicator muted text-muted";
      soundIcon.setAttribute('data-lucide', 'volume-x');
      alarmSound.pause();
    }
    lucide.createIcons();
    checkBuzzerState();
  });

  btnMuteBuzzer.addEventListener('click', () => {
    isMutedManually = true;
    logEvent('BUZZER', 'Còi báo động đã được tắt âm bằng tay bởi người dùng.', 'info');
    checkBuzzerState();
  });

  // --- Notification Toast & Alert Banners ---
  function triggerToast(message, type = 'warning') {
    const toast = document.createElement('div');
    toast.className = `alert-banner`;
    if (type === 'critical') {
      toast.style.background = 'rgba(239, 68, 68, 0.2)';
      toast.style.borderColor = 'var(--danger)';
    } else if (type === 'success') {
      toast.style.background = 'rgba(16, 185, 129, 0.2)';
      toast.style.borderColor = 'var(--success)';
    } else {
      toast.style.background = 'rgba(251, 191, 36, 0.2)';
      toast.style.borderColor = 'var(--power)';
    }

    const icon = type === 'critical' ? 'shield-alert' : (type === 'success' ? 'check-circle' : 'info');

    toast.innerHTML = `
      <div class="alert-content">
        <i data-lucide="${icon}"></i>
        <div class="alert-message">${message}</div>
      </div>
      <button class="alert-close">&times;</button>
    `;

    activeAlertsContainer.appendChild(toast);
    lucide.createIcons();

    // Close button event
    toast.querySelector('.alert-close').addEventListener('click', () => {
      toast.remove();
    });

    // Auto remove after 6 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideIn 0.3s ease-in reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, 6000);
  }

  // --- Logger ---
  function logEvent(type, detail, severity = 'info') {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const tr = document.createElement('tr');

    let badgeClass = 'info';
    if (severity === 'critical') badgeClass = 'crit';
    if (severity === 'warning') badgeClass = 'warn';

    tr.innerHTML = `
      <td>${timeStr}</td>
      <td><span class="log-badge ${badgeClass}">${type}</span></td>
      <td>${detail}</td>
      <td>${severity.toUpperCase()}</td>
    `;

    alertLogTbody.prepend(tr);

    // Limit log rows to 100
    if (alertLogTbody.rows.length > 100) {
      alertLogTbody.deleteRow(alertLogTbody.rows.length - 1);
    }
  }

  btnClearLogs.addEventListener('click', () => {
    alertLogTbody.innerHTML = '';
    logEvent('HỆ THỐNG', 'Lịch sử cảnh báo đã được xóa.', 'info');
  });

  // --- Chart.js Setups ---
  const ctxDht = document.getElementById('dhtChart').getContext('2d');
  const dhtChart = new Chart(ctxDht, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Nhiệt độ (°C)',
          data: [],
          borderColor: 'rgb(224, 122, 95)', // Terracotta
          backgroundColor: 'rgba(224, 122, 95, 0.05)',
          fill: true,
          tension: 0.3,
          yAxisID: 'yTemp'
        },
        {
          label: 'Độ ẩm (%)',
          data: [],
          borderColor: 'rgb(139, 178, 201)', // Water blue
          backgroundColor: 'rgba(139, 178, 201, 0.05)',
          fill: true,
          tension: 0.3,
          yAxisID: 'yHum'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(30, 41, 59, 0.06)' },
          ticks: { color: '#1e293b', font: { family: 'Fredoka', size: 10, weight: '600' } }
        },
        yTemp: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Nhiệt độ (°C)', color: 'rgb(224, 122, 95)', font: { family: 'Fredoka', weight: 'bold', size: 11 } },
          grid: { color: 'rgba(30, 41, 59, 0.08)' },
          ticks: { color: '#1e293b', font: { family: 'Fredoka', weight: '600' } }
        },
        yHum: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Độ ẩm (%)', color: 'rgb(139, 178, 201)', font: { family: 'Fredoka', weight: 'bold', size: 11 } },
          grid: { drawOnChartArea: false },
          ticks: { color: '#1e293b', font: { family: 'Fredoka', weight: '600' } }
        }
      },
      plugins: {
        legend: { labels: { color: '#1e293b', font: { family: 'Fredoka', size: 11, weight: '700' } } }
      }
    }
  });

  const ctxPower = document.getElementById('powerChart').getContext('2d');
  const powerChart = new Chart(ctxPower, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Công suất làm lạnh (W)',
        data: [],
        borderColor: 'rgb(217, 160, 91)', // Amber
        backgroundColor: 'rgba(217, 160, 91, 0.05)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(30, 41, 59, 0.06)' },
          ticks: { color: '#1e293b', font: { family: 'Fredoka', size: 10, weight: '600' } }
        },
        y: {
          title: { display: true, text: 'Công suất (W)', color: 'rgb(217, 160, 91)', font: { family: 'Fredoka', weight: 'bold', size: 11 } },
          grid: { color: 'rgba(30, 41, 59, 0.08)' },
          ticks: { color: '#1e293b', font: { family: 'Fredoka', weight: '600' } }
        }
      },
      plugins: {
        legend: { labels: { color: '#1e293b', font: { family: 'Fredoka', size: 11, weight: '700' } } }
      }
    }
  });

  function addChartData(chart, label, data1, data2 = null) {
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(data1);
    if (data2 !== null) {
      chart.data.datasets[1].data.push(data2);
    }

    // Keep max 25 data points
    if (chart.data.labels.length > 25) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
      if (data2 !== null) {
        chart.data.datasets[1].data.shift();
      }
    }
    chart.update();
  }

  btnChartDhtClear.addEventListener('click', () => {
    dhtChart.data.labels = [];
    dhtChart.data.datasets[0].data = [];
    dhtChart.data.datasets[1].data = [];
    dhtChart.update();
    logEvent('BIỂU ĐỒ', 'Đã xóa dữ liệu lịch sử Nhiệt độ / Độ ẩm.', 'info');
  });

  btnChartPowerClear.addEventListener('click', () => {
    powerChart.data.labels = [];
    powerChart.data.datasets[0].data = [];
    powerChart.update();
    logEvent('BIỂU ĐỒ', 'Đã xóa dữ liệu lịch sử Công suất.', 'info');
  });

  // --- Real-time Data Processor ---
  function updateDeviceData(newData) {
    // 1. Calculate Power and Cumulative Energy
    const voltage = 220.0; // Standard Household Voltage
    state.current = newData.current;
    state.power = state.current * voltage; // P = U*I (assumed resistive load/heating/cooling Peltier for simple display)

    const nowTime = Date.now();
    const durationHrs = (nowTime - lastEnergyUpdateTime) / (1000 * 60 * 60);
    lastEnergyUpdateTime = nowTime;

    state.energy += (state.power / 1000) * durationHrs; // kWh

    state.temp = newData.temp;
    state.hum = newData.hum;
    state.door = newData.door;

    // 2. Update UI values
    tempVal.textContent = state.temp.toFixed(1);
    humidityVal.textContent = state.hum.toFixed(0);
    powerVal.textContent = state.power.toFixed(1);
    currentVal.textContent = state.current.toFixed(2);
    energyVal.textContent = state.energy.toFixed(5);

    // Update climate horizontal progress bars
    const tempPercent = Math.max(0, Math.min(100, ((state.temp - thresholds.tempMin) / (thresholds.tempMax - thresholds.tempMin)) * 100));
    const humPercent = Math.max(0, Math.min(100, ((state.hum - thresholds.humMin) / (thresholds.humMax - thresholds.humMin)) * 100));

    const tempBar = document.getElementById('temp-bar');
    const humBar = document.getElementById('humidity-bar');
    if (tempBar) tempBar.style.width = tempPercent + '%';
    if (humBar) humBar.style.width = humPercent + '%';

    // 3. Process Door Status (NC magnet sensor)
    // 0 = Closed (an toàn), 1 = Open (cảnh báo)
    if (state.door === 1) {
      doorVal.textContent = 'MỞ';
      doorVal.style.color = 'var(--danger)';
      doorIcon.setAttribute('data-lucide', 'door-open');
      doorIcon.style.color = 'var(--danger)';

      // Start door timer if not already running
      if (!doorOpenTimer) {
        doorOpenSeconds = 0;
        doorOpenTimer = setInterval(() => {
          doorOpenSeconds++;
          doorTimer.textContent = `${doorOpenSeconds} giây`;

          if (doorOpenSeconds >= 10 && !activeAlarms.doorOpenTooLong) {
            activeAlarms.doorOpenTooLong = true;
            isMutedManually = false;
            cardDoor.classList.add('warning-glow');
            doorBadge.textContent = 'Mở quá lâu!';
            doorBadge.className = 'badge-status warning pulse-danger';
            logEvent('CỬA TỦ', 'Cửa tủ thực phẩm đã mở quá 10 giây! Nguy cơ thất thoát nhiệt.', 'critical');
            triggerToast('Cảnh báo: Cửa tủ thực phẩm mở quá lâu!', 'critical');
            checkBuzzerState();
          }
        }, 1000);
      }
    } else {
      // Door is closed
      doorVal.textContent = 'ĐÓNG';
      doorVal.style.color = 'var(--success)';
      doorIcon.setAttribute('data-lucide', 'door-closed');
      doorIcon.style.color = 'var(--success)';

      if (doorOpenTimer) {
        clearInterval(doorOpenTimer);
        doorOpenTimer = null;
      }
      doorOpenSeconds = 0;
      doorTimer.textContent = '0 giây';
      cardDoor.classList.remove('warning-glow');

      if (activeAlarms.doorOpenTooLong) {
        activeAlarms.doorOpenTooLong = false;
        doorBadge.textContent = 'An toàn';
        doorBadge.className = 'badge-status normal';
        logEvent('CỬA TỦ', 'Cửa tủ đã được đóng lại.', 'info');
        checkBuzzerState();
      }
    }

    // 5. Check Thresholds (Temp & Humidity)
    // Temperature check
    if (state.temp > thresholds.tempMax) {
      if (!activeAlarms.tempHigh) {
        activeAlarms.tempHigh = true;
        isMutedManually = false;
        cardTemp.classList.add('warning-glow');
        logEvent('NHIỆT ĐỘ', `Nhiệt độ vượt quá mức tối đa cho phép: ${state.temp.toFixed(1)}°C > ${thresholds.tempMax.toFixed(1)}°C`, 'critical');
        triggerToast(`Nhiệt độ vượt quá mức tối đa: ${state.temp.toFixed(1)} °C`, 'critical');
      }
    } else {
      if (activeAlarms.tempHigh) {
        activeAlarms.tempHigh = false;
        cardTemp.classList.remove('warning-glow');
        logEvent('NHIỆT ĐỘ', `Nhiệt độ đã trở lại ngưỡng an toàn: ${state.temp.toFixed(1)}°C`, 'info');
      }
    }

    if (state.temp < thresholds.tempMin) {
      if (!activeAlarms.tempLow) {
        activeAlarms.tempLow = true;
        isMutedManually = false;
        cardTemp.classList.add('warning-glow');
        logEvent('NHIỆT ĐỘ', `Nhiệt độ dưới mức tối thiểu cho phép: ${state.temp.toFixed(1)}°C < ${thresholds.tempMin.toFixed(1)}°C`, 'critical');
        triggerToast(`Nhiệt độ dưới mức tối thiểu: ${state.temp.toFixed(1)} °C`, 'critical');
      }
    } else {
      if (activeAlarms.tempLow) {
        activeAlarms.tempLow = false;
        // Check if high is also resolved
        if (!activeAlarms.tempHigh) cardTemp.classList.remove('warning-glow');
        logEvent('NHIỆT ĐỘ', `Nhiệt độ đã trở lại ngưỡng an toàn: ${state.temp.toFixed(1)}°C`, 'info');
      }
    }

    // Humidity check
    if (state.hum > thresholds.humMax) {
      if (!activeAlarms.humHigh) {
        activeAlarms.humHigh = true;
        isMutedManually = false;
        cardHumidity.classList.add('warning-glow');
        logEvent('ĐỘ ẨM', `Độ ẩm vượt quá mức tối đa cho phép: ${state.hum.toFixed(0)}% > ${thresholds.humMax}%`, 'critical');
        triggerToast(`Độ ẩm vượt quá mức tối đa: ${state.hum.toFixed(0)} %`, 'critical');
      }
    } else {
      if (activeAlarms.humHigh) {
        activeAlarms.humHigh = false;
        cardHumidity.classList.remove('warning-glow');
        logEvent('ĐỘ ẨM', `Độ ẩm đã trở lại ngưỡng an toàn: ${state.hum.toFixed(0)}%`, 'info');
      }
    }

    if (state.hum < thresholds.humMin) {
      if (!activeAlarms.humLow) {
        activeAlarms.humLow = true;
        isMutedManually = false;
        cardHumidity.classList.add('warning-glow');
        logEvent('ĐỘ ẨM', `Độ ẩm dưới mức tối thiểu cho phép: ${state.hum.toFixed(0)}% < ${thresholds.humMin}%`, 'critical');
        triggerToast(`Độ ẩm dưới mức tối thiểu: ${state.hum.toFixed(0)} %`, 'critical');
      }
    } else {
      if (activeAlarms.humLow) {
        activeAlarms.humLow = false;
        if (!activeAlarms.humHigh) cardHumidity.classList.remove('warning-glow');
        logEvent('ĐỘ ẨM', `Độ ẩm đã trở lại ngưỡng an toàn: ${state.hum.toFixed(0)}%`, 'info');
      }
    }

    // Update overall climate status badge
    const envStatus = document.getElementById('env-status');
    if (envStatus) {
      const isClimateAlarming = activeAlarms.tempHigh || activeAlarms.tempLow || activeAlarms.humHigh || activeAlarms.humLow;
      if (isClimateAlarming) {
        envStatus.textContent = 'Cảnh báo';
        envStatus.className = 'env-status-badge danger';
      } else {
        envStatus.textContent = 'Ổn định';
        envStatus.className = 'env-status-badge';
      }
    }

    // 6. Calculate Storage Performance (Hiệu suất bảo quản thực phẩm)
    // Target temp: middle of thresholds. Range: thresholds width
    const targetTemp = (thresholds.tempMax + thresholds.tempMin) / 2;
    const tempRange = thresholds.tempMax - thresholds.tempMin;
    const tempDev = Math.abs(state.temp - targetTemp);

    // Performance starts at 100%
    let perf = 100;

    // Deduct points based on temperature deviation
    if (tempRange > 0) {
      const devRatio = tempDev / (tempRange / 2); // 1.0 means it is exactly on the limit
      perf -= devRatio * 40; // max deduction of 40% for reaching temp limit
    }

    // Deduct for humidity deviation
    const targetHum = (thresholds.humMax + thresholds.humMin) / 2;
    const humRange = thresholds.humMax - thresholds.humMin;
    const humDev = Math.abs(state.hum - targetHum);
    if (humRange > 0) {
      const devRatio = humDev / (humRange / 2);
      perf -= devRatio * 20;
    }

    // Deduct for door left open
    if (state.door === 1) {
      perf -= 15; // Instant 15% drop if open
      if (doorOpenSeconds > 10) {
        perf -= Math.min(25, (doorOpenSeconds - 10) * 1.5); // progressively drop as door stays open
      }
    }

    // Clamp to 10 - 100%
    state.efficiency = Math.round(Math.max(10, Math.min(100, perf)));
    efficiencyVal.textContent = state.efficiency;

    // Color performance indicator
    if (state.efficiency >= 85) {
      efficiencyVal.style.color = 'var(--success)';
    } else if (state.efficiency >= 60) {
      efficiencyVal.style.color = 'var(--power)';
    } else {
      efficiencyVal.style.color = 'var(--danger)';
    }

    // 7. Check Buzzer Local Alarm status
    checkBuzzerState();

    // 8. Push to Charts
    const now = new Date();
    const timeLbl = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    addChartData(dhtChart, timeLbl, state.temp, state.hum);
    addChartData(powerChart, timeLbl, state.power);

    // Recreate Lucide Icons inside updated areas
    lucide.createIcons();
  }

  function sendBuzzerStateToESP32() {
    if (isSimulated) return;
    const ip = esp32Ip.value.trim();
    if (!ip) return;

    fetch(`http://${ip}/data?buzzer=${state.buzzer}`)
      .then(response => {
        if (response.ok) {
          logEvent('BUZZER', `Đã đồng bộ trạng thái còi (${state.buzzer === 1 ? 'BẬT' : 'TẮT'}) tới ESP32 thành công.`, 'info');
        }
      })
      .catch(err => console.error('Error sending immediate buzzer command:', err));
  }

  function checkBuzzerState() {
    const shouldAlarm = Object.values(activeAlarms).some(v => v === true);

    // Determine if the physical buzzer (relay) should be active
    let physicalBuzzerOn = false;
    if (soundEnabled && shouldAlarm && !isMutedManually) {
      physicalBuzzerOn = true;
    }

    const previousBuzzerState = state.buzzer;

    if (physicalBuzzerOn) {
      state.buzzer = 1;
      buzzerVal.textContent = 'BẬT';
      buzzerVal.style.color = 'var(--danger)';
      buzzerIcon.setAttribute('data-lucide', 'bell-ring');
      buzzerIcon.style.color = 'var(--danger)';
      buzzerIcon.classList.add('pulse-danger');
      buzzerBadge.textContent = 'ĐANG CẢNH BÁO';
      buzzerBadge.className = 'badge-status warning pulse-danger';
      cardAlarm.classList.add('warning-glow');

      btnMuteBuzzer.style.display = 'block';
    } else {
      state.buzzer = 0;
      buzzerVal.textContent = 'TẮT';
      buzzerVal.style.color = '';
      buzzerIcon.setAttribute('data-lucide', 'bell');
      buzzerIcon.style.color = '';
      buzzerIcon.classList.remove('pulse-danger');

      if (shouldAlarm && isMutedManually) {
        buzzerBadge.textContent = 'Đã tắt tạm thời';
        buzzerBadge.className = 'badge-status warning';
      } else {
        buzzerBadge.textContent = 'Im lặng';
        buzzerBadge.className = 'badge-status inactive';
      }

      cardAlarm.classList.remove('warning-glow');
      btnMuteBuzzer.style.display = 'none';

      if (!shouldAlarm) {
        isMutedManually = false; // Reset manual mute when alarm resolves
      }
    }

    updateAlarmAudio();

    if (state.buzzer !== previousBuzzerState) {
      sendBuzzerStateToESP32();
    }
  }

  // --- Threshold Settings Sliders Event Handlers ---
  threshTempMax.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    threshTempMaxVal.textContent = `${val.toFixed(1)} °C`;

    // Limit min check to avoid crossover
    if (val <= parseFloat(threshTempMin.value)) {
      threshTempMin.value = (val - 1.0).toFixed(1);
      threshTempMinVal.textContent = `${(val - 1.0).toFixed(1)} °C`;
    }
  });

  threshTempMin.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    threshTempMinVal.textContent = `${val.toFixed(1)} °C`;

    // Limit max check to avoid crossover
    if (val >= parseFloat(threshTempMax.value)) {
      threshTempMax.value = (val + 1.0).toFixed(1);
      threshTempMaxVal.textContent = `${(val + 1.0).toFixed(1)} °C`;
    }
  });

  threshHumMax.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    threshHumMaxVal.textContent = `${val} %`;

    if (val <= parseInt(threshHumMin.value)) {
      threshHumMin.value = val - 5;
      threshHumMinVal.textContent = `${val - 5} %`;
    }
  });

  threshHumMin.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    threshHumMinVal.textContent = `${val} %`;

    if (val >= parseInt(threshHumMax.value)) {
      threshHumMax.value = val + 5;
      threshHumMaxVal.textContent = `${val + 5} %`;
    }
  });

  btnSaveThresholds.addEventListener('click', () => {
    thresholds.tempMax = parseFloat(threshTempMax.value);
    thresholds.tempMin = parseFloat(threshTempMin.value);
    thresholds.humMax = parseInt(threshHumMax.value);
    thresholds.humMin = parseInt(threshHumMin.value);

    localStorage.setItem('food_storage_thresholds', JSON.stringify(thresholds));

    // Update dashboard stat card footers
    tempMinLbl.textContent = thresholds.tempMin.toFixed(1);
    tempMaxLbl.textContent = thresholds.tempMax.toFixed(1);
    humidityMinLbl.textContent = thresholds.humMin;
    humidityMaxLbl.textContent = thresholds.humMax;

    logEvent('CẤU HÌNH', `Đã lưu cài đặt ngưỡng an toàn: Temp [${thresholds.tempMin}, ${thresholds.tempMax}]°C | Hum [${thresholds.humMin}, ${thresholds.humMax}]%`, 'info');
    triggerToast('Cấu hình ngưỡng an toàn đã được lưu!', 'success');

    // Force recheck on current data with new thresholds
    updateDeviceData({
      temp: state.temp,
      hum: state.hum,
      door: state.door,
      current: state.current
    });
  });

  // --- Device Simulator Panel Event Handlers ---
  function updateSimLabels() {
    simTempVal.textContent = `${parseFloat(simTemp.value).toFixed(1)} °C`;
    simHumVal.textContent = `${simHum.value} %`;
    simCurrentVal.textContent = `${parseFloat(simCurrent.value).toFixed(2)} A`;
  }

  function handleSimSliderInput() {
    updateSimLabels();
    if (isSimulated) {
      // Feed directly into data pipeline
      updateDeviceData({
        temp: parseFloat(simTemp.value),
        hum: parseInt(simHum.value),
        door: simBtnDoor.classList.contains('active') ? 1 : 0,
        current: parseFloat(simCurrent.value)
      });
    }
  }

  simTemp.addEventListener('input', handleSimSliderInput);
  simHum.addEventListener('input', handleSimSliderInput);
  simCurrent.addEventListener('input', handleSimSliderInput);

  simBtnDoor.addEventListener('click', () => {
    simBtnDoor.classList.toggle('active');

    const isOpen = simBtnDoor.classList.contains('active');
    if (isOpen) {
      simBtnDoor.innerHTML = '<i data-lucide="door-open"></i> Đang mở';
      logEvent('GIẢ LẬP', 'Đã mô phỏng mở cửa tủ thực phẩm.', 'info');
    } else {
      simBtnDoor.innerHTML = '<i data-lucide="door-closed"></i> Đang đóng';
      logEvent('GIẢ LẬP', 'Đã mô phỏng đóng cửa tủ thực phẩm.', 'info');
    }
    lucide.createIcons();

    if (isSimulated) {
      updateDeviceData({
        temp: parseFloat(simTemp.value),
        hum: parseInt(simHum.value),
        door: isOpen ? 1 : 0,
        current: parseFloat(simCurrent.value)
      });
    }
  });

  simBtnAuto.addEventListener('click', () => {
    autoDriftActive = !autoDriftActive;
    if (autoDriftActive) {
      simBtnAuto.classList.add('active', 'success-style');
      simBtnAuto.innerHTML = '<i data-lucide="refresh-cw" class="pulse"></i> Đang tự động biến động';
      startAutoDrift();
    } else {
      simBtnAuto.classList.remove('active', 'success-style');
      simBtnAuto.innerHTML = '<i data-lucide="refresh-cw"></i> Đã dừng biến động';
    }
    lucide.createIcons();
  });

  // --- Auto Drift Logic (Simulating live drift data) ---
  function startAutoDrift() {
    if (autoDriftInterval) clearInterval(autoDriftInterval);

    autoDriftInterval = setInterval(() => {
      if (!isSimulated || !autoDriftActive) return;

      // Random walk for values
      let newTemp = parseFloat(simTemp.value) + (Math.random() - 0.5) * 0.4;
      let newHum = parseInt(simHum.value) + Math.round((Math.random() - 0.5) * 2);

      // Assumed compressor activity (current increases when temp is high, drops when cool)
      const targetComfort = (thresholds.tempMax + thresholds.tempMin) / 2;
      let currentBase = 0.05; // Base passive power
      if (newTemp > targetComfort) {
        // Compressor turns on to cool down
        currentBase = 0.6 + (newTemp - targetComfort) * 0.15;
        // Temperature starts drifting slowly downwards
        newTemp -= 0.15;
      } else {
        // Reached cool state, compressor idles
        currentBase = 0.05;
        // Warm up slowly due to ambient temperature
        newTemp += 0.08;
      }

      let newCurrent = currentBase + (Math.random() - 0.5) * 0.05;
      if (newCurrent < 0) newCurrent = 0;

      // Clamp simulated values to reasonable numbers
      newTemp = Math.max(-8, Math.min(22, newTemp));
      newHum = Math.max(30, Math.min(95, newHum));
      newCurrent = Math.max(0, Math.min(1.8, newCurrent));

      // Feed to sliders
      simTemp.value = newTemp.toFixed(1);
      simHum.value = newHum;
      simCurrent.value = newCurrent.toFixed(2);

      updateSimLabels();

      // Trigger random events occasionally
      // 2% chance of door opening automatically if it is currently closed
      const isDoorOpen = simBtnDoor.classList.contains('active');
      if (!isDoorOpen && Math.random() < 0.02) {
        simBtnDoor.click(); // Open the door

        // Schedule it to close after 6 seconds
        setTimeout(() => {
          if (simBtnDoor.classList.contains('active')) {
            simBtnDoor.click(); // Close it
          }
        }, 6000);
      }
      // Update actual data pipeline
      updateDeviceData({
        temp: newTemp,
        hum: newHum,
        door: simBtnDoor.classList.contains('active') ? 1 : 0,
        current: newCurrent
      });

    }, 2000);
  }

  // --- Real Device Network Polling ---
  function startRealDevicePolling() {
    if (realDeviceInterval) clearInterval(realDeviceInterval);

    const ip = esp32Ip.value.trim();
    if (!ip) {
      realConnStatus.textContent = 'IP không được trống!';
      realConnStatus.style.color = 'var(--danger)';
      return;
    }

    // Basic IP validation regex
    const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(ip)) {
      realConnStatus.textContent = 'IP không đúng định dạng! Ví dụ: 192.168.1.15';
      realConnStatus.style.color = 'var(--danger)';
      return;
    }

    const rate = parseInt(realPollRate.value);
    realConnStatus.textContent = `Đang kết nối tới http://${ip}/data...`;
    realConnStatus.style.color = 'var(--info)';

    // Set Header Status to warning/connecting
    connectionStatus.className = 'connection-badge disconnected';
    connectionText.textContent = 'Kết nối thực...';

    let failureCount = 0;

    const pollFunc = () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800); // abort if taking too long

      fetch(`http://${ip}/data?buzzer=${state.buzzer}`, { signal: controller.signal })
        .then(response => {
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error('API response error');
          return response.json();
        })
        .then(jsonData => {
          failureCount = 0;

          // Switch to real mode if successful
          if (isSimulated) {
            isSimulated = false;
            connectionStatus.className = 'connection-badge connected';
            connectionText.textContent = 'Đã kết nối';
            logEvent('KẾT NỐI', `Thiết bị thực tại IP ${ip} đã trực tiếp đồng bộ dữ liệu thành công.`, 'info');
            triggerToast('Đã kết nối thiết bị thực thành công!', 'success');
          }

          realConnStatus.textContent = `Đồng bộ lúc: ${new Date().toLocaleTimeString()} (Tốt)`;
          realConnStatus.style.color = 'var(--success)';

          // Feed ESP32 data into dashboard
          updateDeviceData({
            temp: parseFloat(jsonData.temp),
            hum: parseInt(jsonData.hum),
            door: parseInt(jsonData.door),
            current: parseFloat(jsonData.current)
          });
        })
        .catch(err => {
          clearTimeout(timeoutId);
          failureCount++;
          console.error('Fetch error:', err);

          realConnStatus.textContent = `Lỗi kết nối (${failureCount} lần): Không thể truy cập http://${ip}/data. Vui lòng kiểm tra địa chỉ IP ESP32 và đảm bảo ESP32 bật WebServer hỗ trợ CORS.`;
          realConnStatus.style.color = 'var(--danger)';

          // If already in connected mode, degrade to disconnected
          if (!isSimulated) {
            connectionStatus.className = 'connection-badge disconnected';
            connectionText.textContent = 'Lỗi kết nối';
          }

          if (failureCount >= 3 && !isSimulated) {
            // Revert back to simulator to keep the dashboard working
            revertToSimulator();
            logEvent('KẾT NỐI', 'Mất kết nối thiết bị thực quá 3 lần. Đã tự động hoàn tác về chế độ Giả lập.', 'warning');
            triggerToast('Mất kết nối thiết bị thực! Đã bật lại bộ Giả lập.', 'warning');
          }
        });
    };

    // Poll immediately
    pollFunc();
    // Start interval
    realDeviceInterval = setInterval(pollFunc, rate);
  }

  function revertToSimulator() {
    isSimulated = true;
    if (realDeviceInterval) {
      clearInterval(realDeviceInterval);
      realDeviceInterval = null;
    }
    connectionStatus.className = 'connection-badge simulated';
    connectionText.textContent = 'Giả Lập Live';
    realConnStatus.textContent = 'Đã hoàn tác về chế độ giả lập.';
    realConnStatus.style.color = 'var(--text-muted)';
  }

  btnConnectReal.addEventListener('click', () => {
    isSimulated = false;
    startRealDevicePolling();
  });

  realPollRate.addEventListener('change', () => {
    if (!isSimulated) {
      // Restart polling with new rate
      startRealDevicePolling();
    }
  });

  // --- Sub-panel Tabs Navigation ---
  // Simulator Panel Tabs
  tabBtnSim.addEventListener('click', () => {
    tabBtnSim.classList.add('active');
    tabBtnReal.classList.remove('active');
    tabContentSim.classList.add('active');
    tabContentSim.style.display = 'flex';
    tabContentReal.classList.remove('active');
    tabContentReal.style.display = 'none';

    revertToSimulator();
    logEvent('HỆ THỐNG', 'Chuyển sang chế độ GIẢ LẬP số liệu.', 'info');
  });

  tabBtnReal.addEventListener('click', () => {
    tabBtnReal.classList.add('active');
    tabBtnSim.classList.remove('active');
    tabContentReal.classList.add('active');
    tabContentReal.style.display = 'flex';
    tabContentSim.classList.remove('active');
    tabContentSim.style.display = 'none';

    logEvent('HỆ THỐNG', 'Chuyển sang chế độ kết nối THIẾT BỊ THẬT.', 'info');
  });

  // Code Panel Tabs
  tabBtnCode.addEventListener('click', () => {
    tabBtnCode.classList.add('active');
    tabBtnApi.classList.remove('active');
    tabContentCode.classList.add('active');
    tabContentCode.style.display = 'flex';
    tabContentApi.classList.remove('active');
    tabContentApi.style.display = 'none';
  });

  tabBtnApi.addEventListener('click', () => {
    tabBtnApi.classList.add('active');
    tabBtnCode.classList.remove('active');
    tabContentApi.classList.add('active');
    tabContentApi.style.display = 'flex';
    tabContentCode.classList.remove('active');
    tabContentCode.style.display = 'none';
  });

  // --- Setup Copy Code Function ---
  const esp32CodeStr = `#include <WiFi.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFiManager.h> // Thêm thư viện WiFiManager
#include "DHT.h"

// --- KHÔNG THAY ĐỔI CẤU HÌNH CHÂN KẾT NỐI VẬT LÝ CỦA BẠN ---
#define DHTPIN 2          
#define DHTTYPE DHT22     
#define DOOR_PIN 3        
#define RELAY_PIN 5       
#define ACS_PIN 0         

#define RELAY_ON  HIGH
#define RELAY_OFF LOW

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80); // Khởi tạo WebServer cổng 80

// Biến lưu thông số cảm biến để gửi lên Web Dashboard
float temperature = 0.0;
float humidity = 0.0;
int doorState = LOW;
float currentVal = 0.0;

unsigned long previousMillis = 0;
const long interval = 2000; 

// Hàm xử lý API Endpoint /data trả về JSON cho Dashboard
void handleDataEndpoint() {
  // Nhận lệnh tắt/bật còi báo động từ giao diện Web
  if (server.hasArg("buzzer")) {
    int buzzerArg = server.arg("buzzer").toInt();
    digitalWrite(RELAY_PIN, buzzerArg ? RELAY_ON : RELAY_OFF);
  }
  
  // Trả về JSON (Cửa tủ: HIGH = Mở = 1, LOW = Đóng = 0)
  String json = "{\\n";
  json += "  \\"temp\\": " + String(temperature, 1) + ",\\n";
  json += "  \\"hum\\": " + String(humidity, 0) + ",\\n";
  json += "  \\"door\\": " + String(doorState == HIGH ? 1 : 0) + ",\\n";
  json += "  \\"current\\": " + String(currentVal, 3) + "\\n";
  json += "}";
  
  server.sendHeader("Access-Control-Allow-Origin", "*"); // CORS Header cho phép trình duyệt truy cập
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n====== KHỞI ĐỘNG HỆ THỐNG ======");

  // Khởi tạo các cảm biến và relay
  dht.begin();
  pinMode(DOOR_PIN, INPUT_PULLUP); 
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF);

  // KẾT NỐI WI-FI QUA WIFIMANAGER
  WiFiManager wm;
  wm.setConfigPortalTimeout(180); 
  
  if (!wm.autoConnect("ESP32_QuanLyThucPham")) {
    Serial.println("Kết nối thất bại hoặc hết thời gian chờ cấu hình. Đang khởi động lại ESP...");
    delay(3000);
    ESP.restart();
  }

  // Kết nối thành công
  Serial.println("");
  Serial.println("🎉 ĐÃ KẾT NỐI WI-FI THÀNH CÔNG!");
  Serial.print("Địa chỉ IP của ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.println("=================================================");

  // Khởi chạy WebServer
  server.on("/data", HTTP_GET, handleDataEndpoint);
  server.begin();
  Serial.println("HTTP WebServer đã khởi chạy thành công.");
}

void loop() {
  server.handleClient(); // Xử lý các yêu cầu kết nối từ Web Dashboard

  unsigned long currentMillis = millis();
  doorState = digitalRead(DOOR_PIN);

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    humidity = dht.readHumidity();
    temperature = dht.readTemperature();

    // Đọc ADC từ ACS712 và tính toán dòng điện (Ampe)
    float avgADC = 0;
    for(int i = 0; i < 20; i++) {
      avgADC += analogRead(ACS_PIN);
      delay(1);
    }
    avgADC = avgADC / 20.0;

    // Chuyển đổi giá trị ADC thành dòng điện thực tế (chỉnh offset & độ nhạy của ACS712)
    float adcVolt = (avgADC / 4095.0) * 3.3;
    currentVal = (adcVolt - 1.65) / 0.185; // Cảm biến ACS712 5A (Độ nhạy 185mV/A, offset 1.65V)
    if (currentVal < 0.02) {
      currentVal = 0.0; // Lọc bỏ nhiễu dòng điện nhỏ
    }

    Serial.println("\\n--- THÔNG SỐ HỆ THỐNG ---");
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("❌ Lỗi: Không đọc được dữ liệu từ DHT22!");
    } else {
      Serial.print("🌡️ Nhiệt độ: "); Serial.print(temperature, 1); Serial.println(" °C");
      Serial.print("💧 Độ ẩm: "); Serial.print(humidity, 1); Serial.println(" %");
    }

    Serial.print("🚪 Cửa tủ: "); 
    Serial.println((doorState == HIGH) ? "ĐANG MỞ 🔓" : "ĐÃ ĐÓNG 🔒");
    Serial.print("⚡ Dòng điện: "); Serial.print(currentVal, 3); Serial.println(" A");
    Serial.print("📡 Wi-Fi hiện tại: "); Serial.println(WiFi.SSID());
    Serial.print("🌐 Địa chỉ IP ESP32: "); Serial.println(WiFi.localIP());
    Serial.println("-------------------------");

    // Còi báo động vật lý (Buzzer) bây giờ sẽ do Web Dashboard điều khiển hoàn toàn
    // nhằm đảm bảo các nút "Tắt còi" và nút "Tắt âm thanh" hoạt động chính xác.
  }
}`;

  esp32CodeBlock.textContent = esp32CodeStr;

  btnCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(esp32CodeStr)
      .then(() => {
        btnCopyCode.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i> Đã Copy!';
        lucide.createIcons();
        triggerToast('Mã nguồn ESP32 đã được sao chép vào clipboard!', 'success');
        setTimeout(() => {
          btnCopyCode.innerHTML = '<i data-lucide="copy" style="width: 14px; height: 14px;"></i> Copy code';
          lucide.createIcons();
        }, 3000);
      })
      .catch(err => {
        console.error('Failed to copy code: ', err);
      });
  });

  // --- Initial Operations ---
  loadSettings();

  // Inject some initial simulator values and run first update
  updateSimLabels();
  updateDeviceData({
    temp: parseFloat(simTemp.value),
    hum: parseInt(simHum.value),
    door: simBtnDoor.classList.contains('active') ? 1 : 0,
    current: parseFloat(simCurrent.value)
  });

  // Start automatic drift simulation
  startAutoDrift();

  // Create initial log events
  logEvent('HỆ THỐNG', 'Khởi chạy dashboard giám sát lưu trữ thực phẩm thành công.', 'info');
  logEvent('HỆ THỐNG', 'Đang hoạt động trong chế độ GIẢ LẬP thời gian thực. Đã kết nối còi Buzzer ảo.', 'info');
});
