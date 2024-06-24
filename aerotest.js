document.addEventListener('DOMContentLoaded', function () {


let cdaBarChart = null;
  

function setPlaceholder(inputId, placeholderText) {
    var inputElement = document.getElementById(inputId);
    if (inputElement.value == '0') {
        inputElement.placeholder = placeholderText;
        inputElement.value = '';
    }
}

function clearPlaceholder(inputId, placeholderText) {
    var inputElement = document.getElementById(inputId);
    if (inputElement.value == '') {
        inputElement.placeholder = '0' + placeholderText;
        inputElement.value = '0';
    }
}

function secondsToHMS(seconds) {
    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}
function parseTimeToSecondsTest(timeStr) {
    if (!timeStr) return NaN;

    let parts;
    let hours = 0, minutes = 0, seconds = 0;

    if (timeStr.includes(':')) {
        parts = timeStr.split(':');

        if (parts.length === 3) { // h:mm:ss or h:mm:ss.SS
            hours = parseInt(parts[0], 10) || 0;
            minutes = parseInt(parts[1], 10) || 0;
            seconds = parseFloat(parts[2]) || 0;
        } else if (parts.length === 2) { // mm:ss or m:ss.SS
            minutes = parseInt(parts[0], 10) || 0;
            if (parts[1].includes('.')) {
                let secParts = parts[1].split('.');
                seconds = parseInt(secParts[0], 10) || 0;
                let milliseconds = parseFloat('0.' + secParts[1]) || 0;
                seconds += milliseconds;
            } else {
                seconds = parseFloat(parts[1]) || 0;
            }
        }
    } else if (timeStr.includes('.')) {
        parts = timeStr.split('.');
        seconds = parseInt(parts[0], 10) || 0;
        let milliseconds = parseFloat('0.' + parts[1]) || 0;
        return seconds + milliseconds;
    } else {
        seconds = parseFloat(timeStr) || 0;
    }

    return (hours * 3600) + (minutes * 60) + seconds;
}

function updatePlaceholderCda(testIndex) {
    const testDistance = parseFloat(document.getElementById(`distance-test${testIndex}`).value);
    const desiredTimeInput = document.getElementById(`time-test${testIndex}`);

    if (testDistance >= 25) {
        desiredTimeInput.placeholder = "h:mm:ss";
        desiredTimeInput.pattern = "^([0-9]?[0-9]):([0-5][0-9]):([0-5][0-9])$";
    } else if (testDistance <= 4 && testDistance > 0.5) {
        desiredTimeInput.placeholder = "mm:ss.SS";
        desiredTimeInput.pattern = "^([0-5]?[0-9]):([0-5][0-9])\\.([0-9]{1,2})$";
    } else if (testDistance <= 0.5) {
        desiredTimeInput.placeholder = "ss.SS";
        desiredTimeInput.pattern = "^([0-5]?[0-9])\\.([0-9]{1,2})$";
    } else {
        desiredTimeInput.placeholder = "mm:ss";
        desiredTimeInput.pattern = "^([0-5]?[0-9]):([0-5][0-9])$";
    }
}

function showResults() {
    document.querySelector('.results-container').classList.remove('hidden');
}

function calculateWindYawAngle(bikeSpeedMS, windSpeedMS, windAngleDegrees) {
    const windAngleRadians = windAngleDegrees * (Math.PI / 180);
    const yawAngle = Math.atan2(windSpeedMS * Math.sin(windAngleRadians), bikeSpeedMS + windSpeedMS * Math.cos(windAngleRadians));
    return yawAngle; // in radians
}

function calculatePowerSavings(cda, airDensity, speedKPH) {
    const speedMS = speedKPH / 3.6; // Convert speed from km/h to m/s
    return 0.5 * airDensity * cda * Math.pow(speedMS, 3);
}

function calculateCdA() {
    const weight = parseFloat(document.getElementById('weight-cda').value);
    const bikeWeight = parseFloat(document.getElementById('bike_weight-cda').value);
    const rollingResistance = parseFloat(document.getElementById('rolling_resistance-cda').value);
    const airDensity = parseFloat(document.getElementById('air_density-cda').value);
    const drivetrainEfficiency = parseFloat(document.getElementById('drivetrain_efficiency-cda').value);

    const tests = [
        {
            name: document.getElementById('test1-name').value || 'Test 1',
            distance: parseFloat(document.getElementById('distance-test1').value),
            time: document.getElementById('time-test1').value,
            power: parseFloat(document.getElementById('power-test1').value),
            windSpeed: parseFloat(document.getElementById('wind_speed-test1').value),
            yawAngle: parseFloat(document.getElementById('yaw_angle-test1').value),
            gradient: parseFloat(document.getElementById('gradient-test1').value) / 100,
            resultElement: document.getElementById('cdaResults-test1')
        },
        {
            name: document.getElementById('test2-name').value || 'Test 2',
            distance: parseFloat(document.getElementById('distance-test2').value),
            time: document.getElementById('time-test2').value,
            power: parseFloat(document.getElementById('power-test2').value),
            windSpeed: parseFloat(document.getElementById('wind_speed-test2').value),
            yawAngle: parseFloat(document.getElementById('yaw_angle-test2').value),
            gradient: parseFloat(document.getElementById('gradient-test2').value) / 100,
            resultElement: document.getElementById('cdaResults-test2')
        },
        {
            name: document.getElementById('test3-name').value || 'Test 3',
            distance: parseFloat(document.getElementById('distance-test3').value),
            time: document.getElementById('time-test3').value,
            power: parseFloat(document.getElementById('power-test3').value),
            windSpeed: parseFloat(document.getElementById('wind_speed-test3').value),
            yawAngle: parseFloat(document.getElementById('yaw_angle-test3').value),
            gradient: parseFloat(document.getElementById('gradient-test3').value) / 100,
            resultElement: document.getElementById('cdaResults-test3')
        }
    ];

    const totalWeight = weight + bikeWeight;
    const g = 9.80665; // Gravitational constant

    let cdaValues = [];
    let wattsPerCdaValues = [];
    let testNames = [];
    let totalPower = 0;

    for (let test of tests) {
        if (!isNaN(test.distance) && test.time && !isNaN(test.power)) {
            const timeSeconds = parseTimeToSecondsTest(test.time);
            const speedMS = (test.distance * 1000) / timeSeconds; // Convert distance from km to m
            const speedKPH = (speedMS * 3.6).toFixed(2); // Convert speed to km/h
            const windSpeedMS = test.windSpeed / 3.6; // Convert wind speed from km/h to m/s
            const yawAngleRad = calculateWindYawAngle(speedMS, windSpeedMS, test.yawAngle);

            const apparentWindSpeed = Math.sqrt(Math.pow(speedMS, 2) + Math.pow(windSpeedMS, 2) + 2 * speedMS * windSpeedMS * Math.cos(yawAngleRad));
            const effectivePower = test.power * drivetrainEfficiency; // Adjust power for drivetrain efficiency
            const rollingResistanceForce = rollingResistance * totalWeight * g;
            const rollingResistancePower = rollingResistanceForce * speedMS;
            const elevationForce = totalWeight * g * test.gradient;
            const elevationPower = elevationForce * speedMS;
            const aerodynamicPower = effectivePower - rollingResistancePower - elevationPower;

            if (aerodynamicPower < 0) {
                test.resultElement.innerHTML = `<strong>${test.name} CdA:<br></strong> Invalid Data (Negative Aerodynamic Power)`;
                continue;
            }

            const directivityFunction = Math.cos(yawAngleRad) ** 2 + 1.2 * Math.sin(yawAngleRad) ** 2;
            const cda = (2 * aerodynamicPower) / (airDensity * Math.pow(apparentWindSpeed, 3) * directivityFunction);

            cdaValues.push(cda);
            testNames.push(test.name);
            totalPower += test.power;

          const wattsPerCda = Math.round(test.power / cda);
            wattsPerCdaValues.push(wattsPerCda);

           const formattedTime = secondsToHMS(timeSeconds);

            test.resultElement.innerHTML = `
                <strong>${test.name} CdA:<br></strong> ${cda.toFixed(4)}<br>
                <strong>Speed:<br></strong> ${speedKPH} km/h<br>
                <strong>Power:<br></strong> ${test.power} W<br>
                <strong>Distance:<br></strong> ${test.distance} km<br>
                <strong>Time:<br></strong> ${formattedTime}<br>
                <strong>Watts/CdA:<br></strong> ${wattsPerCda} W/m²<br>
            `;
        } else {
            test.resultElement.innerHTML = `<strong>${test.name} CdA:<br></strong> Incomplete Data`;
        }
    }

    if (cdaValues.length > 0) {
        showResults();

        const averageCdA = cdaValues.reduce((a, b) => a + b) / cdaValues.length;
        const averagePower = totalPower / cdaValues.length;
        const averageSpeed = cdaValues.reduce((total, cda, index) => total + (tests[index].distance * 1000 / parseTimeToSecondsTest(tests[index].time)) * 3.6, 0) / cdaValues.length;
        const averageWattsPerCda = Math.round(averagePower / averageCdA);

        document.getElementById('cdaResults-average').innerHTML = `
            <strong>Average CdA:<br></strong> ${averageCdA.toFixed(4)}<br>
            <strong>Average Speed:<br></strong> ${averageSpeed.toFixed(2)} km/h<br>
            <strong>Average Power:<br></strong> ${averagePower.toFixed(2)} W<br>
            <strong>Average Watts/CdA:<br></strong> ${averageWattsPerCda} W/m²
        `;

        if (cdaValues.length > 1) {
            let differences = [];

            for (let i = 0; i < cdaValues.length; i++) {
                for (let j = i + 1; j < cdaValues.length; j++) {
                    let absoluteDiff = cdaValues[j] - cdaValues[i];
                    let percentDiff = ((cdaValues[j] - cdaValues[i]) / cdaValues[i]) * 100;
                    differences.push({ test1: tests[i].name, test2: tests[j].name, absDiff: absoluteDiff, percentDiff: percentDiff });
                }
            }

            let differenceString = differences.map(d => `${d.test1} to ${d.test2}: <br>${d.absDiff.toFixed(4)} (${d.percentDiff.toFixed(2)}%)<br>`).join('<br>');
            document.getElementById('cdaResults-difference').innerHTML = `<strong>Differences:</strong> <br>${differenceString}`;

// Calculate power savings at 35 km/h, 45 km/h, and 55 km/h
const speeds = [35, 45, 55];
let powerSavingsHTML = '<strong>Power Savings:</strong><br>';

for (let i = 0; i < speeds.length; i++) {
    powerSavingsHTML += `<strong>At ${speeds[i]} km/h:</strong><br>`;
    for (let j = 0; j < cdaValues.length - 1; j++) {
        for (let k = j + 1; k < cdaValues.length; k++) {
            const power1 = Math.round(calculatePowerSavings(cdaValues[j], airDensity, speeds[i]));
            const power2 = Math.round(calculatePowerSavings(cdaValues[k], airDensity, speeds[i]));
            const powerSaved = Math.round(power1 - power2);

            powerSavingsHTML += `${tests[j].name} to ${tests[k].name}: ${powerSaved} W<br>`;
        }
    }
}

            document.getElementById('cdaResults-power-savings').innerHTML = powerSavingsHTML;
        } else {
            document.getElementById('cdaResults-difference').innerHTML = `<strong>Differences:</strong> N/A`;
            document.getElementById('cdaResults-power-savings').innerHTML = ''; // Clear power savings if less than 2 tests
        }

        document.dispatchEvent(new CustomEvent('cdaCalculated', {
            detail: {
                testNames,
                cdaValues,
                averageCdA,
                weight,
                bikeWeight
            }
        }));

        // Ensure these elements exist if needed
        if (document.getElementById('weight-race')) {
            document.getElementById('weight-race').value = weight;
        }
        if (document.getElementById('bike-weight-race')) {
            document.getElementById('bike-weight-race').value = bikeWeight;
        }
        if (document.getElementById('cda-test1')) {
            document.getElementById('cda-test1').value = cdaValues[0]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-test2')) {
            document.getElementById('cda-test2').value = cdaValues[1]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-test3')) {
            document.getElementById('cda-test3').value = cdaValues[2]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-average')) {
            document.getElementById('cda-average').value = averageCdA.toFixed(4);
        }
        if (document.getElementById('weight-ps')) {
            document.getElementById('weight-ps').value = weight;
        }
        if (document.getElementById('bike-weight-ps')) {
            document.getElementById('bike-weight-ps').value = bikeWeight;
        }
        if (document.getElementById('cda-ps-test1')) {
            document.getElementById('cda-ps-test1').value = cdaValues[0]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-ps-test2')) {
            document.getElementById('cda-ps-test2').value = cdaValues[1]?.toFixed(4) || '';
        }
        if (document.getElementById('cda-ps-test3')) {
            document.getElementById('cda-ps-test3').value = cdaValues[2]?.toFixed(4) || '';
        }

        // Call the graph update function if it exists
        if (typeof updateGraph === 'function') {
            updateGraph(testNames, cdaValues, averageCdA, wattsPerCdaValues);
        }
    }
}

document.querySelectorAll('#weight-cda, #bike_weight-cda, #rolling_resistance-cda, #air_density-cda, #drivetrain_efficiency-cda, #distance-test1, #time-test1, #power-test1, #wind_speed-test1, #yaw_angle-test1, #gradient-test1, #distance-test2, #time-test2, #power-test2, #wind_speed-test2, #yaw_angle-test2, #gradient-test2, #distance-test3, #time-test3, #power-test3, #wind_speed-test3, #yaw_angle-test3, #gradient-test3').forEach(element => {
    element.addEventListener('input', calculateCdA);
    element.addEventListener('change', calculateCdA);
});

document.getElementById('distance-test1').addEventListener('input', () => updatePlaceholderCda(1));
document.getElementById('distance-test2').addEventListener('input', () => updatePlaceholderCda(2));
document.getElementById('distance-test3').addEventListener('input', () => updatePlaceholderCda(3));



function updateGraph(testNames, cdaValues, averageCdA, wattsPerCdaValues) {
    const ctx = document.getElementById('cdaBarChart').getContext('2d');

    const barColors = [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(199, 199, 199, 0.6)',
        'rgba(83, 102, 255, 0.6)',
        'rgba(99, 255, 132, 0.6)',
        'rgba(235, 54, 162, 0.6)',
        'rgba(206, 255, 86, 0.6)',
        'rgba(102, 153, 255, 0.6)',
        'rgba(159, 64, 255, 0.6)',
        'rgba(255, 199, 199, 0.6)',
        'rgba(192, 75, 75, 0.6)'
    ];

    if (cdaBarChart) {
        cdaBarChart.data.labels = testNames;
        cdaBarChart.data.datasets[0].data = cdaValues;
        cdaBarChart.data.datasets[0].backgroundColor = barColors.slice(0, cdaValues.length);
        cdaBarChart.data.datasets[1].data = new Array(cdaValues.length).fill(averageCdA);
        cdaBarChart.data.datasets[2].data = wattsPerCdaValues;
        cdaBarChart.update();
    } else {
        cdaBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: testNames, // Set the labels to the test names
                datasets: [
                    {
                        label: 'CdA Values',
                        data: cdaValues,
                        backgroundColor: barColors.slice(0, cdaValues.length),
                        borderColor: barColors.slice(0, cdaValues.length).map(color => color.replace('0.6', '1')),
                        borderWidth: 1
                    },
                    {
                        label: 'Average CdA',
                        data: new Array(cdaValues.length).fill(averageCdA),
                        type: 'line',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        fill: false,
                        lineTension: 0,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Watts/CdA',
                        data: wattsPerCdaValues,
                        type: 'line',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 3,
                        fill: false,
                        lineTension: 0,
                        yAxisID: 'y1',
                        borderDash: [10, 5], // Add dashed line
                        pointBackgroundColor: 'rgba(54, 162, 235, 1)', // Add point markers
                        pointBorderColor: 'rgba(54, 162, 235, 1)',
                        pointRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true, 
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'CdA',
                            font: {
                                size: 16,
                                weight: 'bold',
                                family: 'Helvetica, Arial, sans-serif'
                            }
                        },
                        ticks: {
                            font: {
                                size: 14
                            },
                            stepSize: 0.025 // Set the step size to spread out the tick marks
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Watts/CdA (W/m²)',
                            font: {
                                size: 16,
                                weight: 'bold',
                                family: 'Helvetica, Arial, sans-serif'
                            }
                        },
                        ticks: {
                            font: {
                                size: 14
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test',
                            font: {
                                size: 16,
                                weight: 'bold',
                                family: 'Helvetica, Arial, sans-serif'
                            }
                        },
                        ticks: {
                            font: {
                                size: 14
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.label === 'Watts/CdA') {
                                    return `Watts/CdA: ${context.parsed.y}`;
                                }
                                return `CdA: ${context.parsed.y.toFixed(4)}`;
                            }
                        }
                    }
                }
            }
        });
    }
}



document.getElementById('calc-mode').addEventListener('change', toggleCalculationMode);
document.getElementById('input-race-distance').addEventListener('input', updatePlaceholder);

function updatePlaceholder() {
  const mode = document.getElementById('calc-mode').value;
  const raceDistance = parseFloat(document.getElementById('input-race-distance').value);
  const desiredTimeInput = document.getElementById('desired-time');

  console.log('updatePlaceholder called');
  console.log('mode:', mode);
  console.log('raceDistance:', raceDistance);

  if (mode === 'required-power') {
    if (raceDistance >= 25) {
      desiredTimeInput.placeholder = "h:mm:ss";
      desiredTimeInput.pattern = "^([0-9]?[0-9]):([0-5][0-9]):([0-5][0-9])$";
    } else if (raceDistance < 4 && raceDistance > 0.5) {
      desiredTimeInput.placeholder = "mm:ss.SS";
      desiredTimeInput.pattern = "^([0-5]?[0-9]):([0-5][0-9])\\.([0-9]{1,2})$";
    } else if (raceDistance <= 0.5) {
      desiredTimeInput.placeholder = "ss.SS";
      desiredTimeInput.pattern = "^([0-5]?[0-9])\\.([0-9]{1,2})$";
    } else {
      desiredTimeInput.placeholder = "mm:ss";
      desiredTimeInput.pattern = "^([0-5]?[0-9]):([0-5][0-9])$";
    }
  } else if (mode === 'race-distance') {
    desiredTimeInput.placeholder = "h:mm:ss";
    desiredTimeInput.pattern = "^([0-9]?[0-9]):([0-5][0-9]):([0-5][0-9])$";
  }
}

function toggleCalculationMode() {
  const mode = document.getElementById('calc-mode').value;

  // Clear the input fields
  document.getElementById('input-race-distance').value = '';
  document.getElementById('race-power').value = '';
  document.getElementById('desired-time').value = '';

  if (mode === 'race-time') {
    document.getElementById('input-race-distance').parentElement.style.display = 'block';
    document.getElementById('race-power').parentElement.style.display = 'block';
    document.getElementById('desired-time').parentElement.style.display = 'none';
  } else if (mode === 'required-power') {
    document.getElementById('input-race-distance').parentElement.style.display = 'block';
    document.getElementById('race-power').parentElement.style.display = 'none';
    document.getElementById('desired-time').parentElement.style.display = 'block';
    document.getElementById('desired-time').placeholder = 'mm:ss';
    document.getElementById('desired-time').pattern = '^([0-5]?[0-9]):([0-5][0-9])$';
  } else if (mode === 'race-distance') {
    document.getElementById('input-race-distance').parentElement.style.display = 'none';
    document.getElementById('race-power').parentElement.style.display = 'block';
    document.getElementById('desired-time').parentElement.style.display = 'block';
    updatePlaceholder(); // Call the function to update the placeholder and pattern
  }
}

function calculateAverageCdA() {
  const cdaTest1 = parseFloat(document.getElementById('cda-test1').value);
  const cdaTest2 = parseFloat(document.getElementById('cda-test2').value);
  const cdaTest3 = parseFloat(document.getElementById('cda-test3').value);

  let sum = 0;
  let count = 0;

  if (!isNaN(cdaTest1)) {
    sum += cdaTest1;
    count++;
  }
  if (!isNaN(cdaTest2)) {
    sum += cdaTest2;
    count++;
  }
  if (!isNaN(cdaTest3)) {
    sum += cdaTest3;
    count++;
  }

  const averageCdA = count > 0 ? (sum / count).toFixed(4) : 0;
  document.getElementById('cda-average').value = averageCdA;

  return parseFloat(averageCdA);
}

function calculate() {
  const mode = document.getElementById('calc-mode').value;

  if (mode === 'race-time') {
    let raceTimeResults = [];
    const raceDistance = parseFloat(document.getElementById('input-race-distance').value);
    const power = parseFloat(document.getElementById('race-power').value);

    if (isNaN(raceDistance) || isNaN(power)) {
      displayResults("");
      return;
    }

    const test1Name = document.getElementById('test1-name').value || 'Test 1';
    const test2Name = document.getElementById('test2-name').value || 'Test 2';
    const test3Name = document.getElementById('test3-name').value || 'Test 3';

    const cdaTest1 = parseFloat(document.getElementById('cda-test1').value);
    const cdaTest2 = parseFloat(document.getElementById('cda-test2').value);
    const cdaTest3 = parseFloat(document.getElementById('cda-test3').value);
    const averageCdA = calculateAverageCdA();

    if (!isNaN(cdaTest1)) {
      const { time: time1, speed: speed1 } = calculateRaceTime(cdaTest1);
      const wattsPerCda1 = Math.round(power / cdaTest1);
      raceTimeResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">${test1Name}: ${cdaTest1.toFixed(4)} CdA</strong><br>
          Time: ${formatRaceTime(time1)}<br>
          Speed: ${speed1.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCda1} W/m²<br><br>
        </div>
      `);
    }
    if (!isNaN(cdaTest2)) {
      const { time: time2, speed: speed2 } = calculateRaceTime(cdaTest2);
      const wattsPerCda2 = Math.round(power / cdaTest2);
      raceTimeResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">${test2Name}: ${cdaTest2.toFixed(4)} CdA</strong><br>
          Time: ${formatRaceTime(time2)}<br>
          Speed: ${speed2.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCda2} W/m²<br><br>
        </div>
      `);
    }
    if (!isNaN(cdaTest3)) {
      const { time: time3, speed: speed3 } = calculateRaceTime(cdaTest3);
      const wattsPerCda3 = Math.round(power / cdaTest3);
      raceTimeResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">${test3Name}: ${cdaTest3.toFixed(4)} CdA</strong><br>
          Time: ${formatRaceTime(time3)}<br>
          Speed: ${speed3.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCda3} W/m²<br><br>
        </div>
      `);
    }
    if (raceTimeResults.length > 1) {
      const { time: avgTime, speed: avgSpeed } = calculateRaceTime(averageCdA);
      const wattsPerCdaAvg = Math.round(power / averageCdA);
      raceTimeResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">Average: ${averageCdA.toFixed(4)} CdA</strong><br>
          Time: ${formatRaceTime(avgTime)}<br>
          Speed: ${avgSpeed.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCdaAvg} W/m²<br><br>
        </div>
      `);
    }

    const result = `
      <div id="race-time">
        <strong>Race Time:</strong><br>
        <div><strong>Race Distance:</strong> ${raceDistance} km</div>
        <div><strong>Power:</strong> ${power} watts <br><br></div>
        <div class="result-group">
          ${raceTimeResults.join('')}
        </div>
      </div>
    `;

    displayResults(result);
  } else if (mode === 'required-power') {
    let powerResults = [];
    const raceDistance = parseFloat(document.getElementById('input-race-distance').value);
    const desiredTime = document.getElementById('desired-time').value;

    if (isNaN(raceDistance) || !desiredTime) {
      displayResults("");
      return;
    }

    const test1Name = document.getElementById('test1-name').value || 'Test 1';
    const test2Name = document.getElementById('test2-name').value || 'Test 2';
    const test3Name = document.getElementById('test3-name').value || 'Test 3';

    const cdaTest1 = parseFloat(document.getElementById('cda-test1').value);
    const cdaTest2 = parseFloat(document.getElementById('cda-test2').value);
    const cdaTest3 = parseFloat(document.getElementById('cda-test3').value);
    const averageCdA = calculateAverageCdA();

    if (!isNaN(cdaTest1)) {
      const { power: requiredPower1, speed: speed1 } = calculateRequiredPower(cdaTest1);
      const wattsPerCda1 = Math.round(requiredPower1 / cdaTest1);
      powerResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">${test1Name}: ${cdaTest1.toFixed(4)} CdA</strong><br>
          Power: ${requiredPower1.toFixed(2)} watts<br>
          Speed: ${speed1.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCda1} W/m²<br><br>
        </div>
      `);
    }
    if (!isNaN(cdaTest2)) {
      const { power: requiredPower2, speed: speed2 } = calculateRequiredPower(cdaTest2);
      const wattsPerCda2 = Math.round(requiredPower2 / cdaTest2);
      powerResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">${test2Name}: ${cdaTest2.toFixed(4)} CdA</strong><br>
          Power: ${requiredPower2.toFixed(2)} watts<br>
          Speed: ${speed2.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCda2} W/m²<br><br>
        </div>
      `);
    }
    if (!isNaN(cdaTest3)) {
      const { power: requiredPower3, speed: speed3 } = calculateRequiredPower(cdaTest3);
      const wattsPerCda3 = Math.round(requiredPower3 / cdaTest3);
      powerResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">${test3Name}: ${cdaTest3.toFixed(4)} CdA</strong><br>
          Power: ${requiredPower3.toFixed(2)} watts<br>
          Speed: ${speed3.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCda3} W/m²<br><br>
        </div>
      `);
    }
    if (powerResults.length > 1) {
      const { power: avgPower, speed: avgSpeed } = calculateRequiredPower(averageCdA);
      const wattsPerCdaAvg = Math.round(avgPower / averageCdA);
      powerResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">Average: ${averageCdA.toFixed(4)} CdA</strong><br>
          Power: ${avgPower.toFixed(2)} watts<br>
          Speed: ${avgSpeed.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCdaAvg} W/m²<br><br>
        </div>
      `);
    }

    const result = `
      <div id="required-power">
        <strong>Required Power:</strong><br>
        <div><strong>Race Distance:</strong> ${raceDistance} km</div>
        <div><strong>Desired Time:</strong> ${desiredTime} <br><br></div>
        <div class="result-group">
          ${powerResults.join('')}
        </div>
      </div>
    `;

    displayResults(result);
  } else if (mode === 'race-distance') {
    let distanceResults = [];
    const desiredTime = document.getElementById('desired-time').value;
    const power = parseFloat(document.getElementById('race-power').value);

    if (!desiredTime || isNaN(power)) {
      displayResults("");
      return;
    }

    const test1Name = document.getElementById('test1-name').value || 'Test 1';
    const test2Name = document.getElementById('test2-name').value || 'Test 2';
    const test3Name = document.getElementById('test3-name').value || 'Test 3';

    const cdaTest1 = parseFloat(document.getElementById('cda-test1').value);
    const cdaTest2 = parseFloat(document.getElementById('cda-test2').value);
    const cdaTest3 = parseFloat(document.getElementById('cda-test3').value);
    const averageCdA = calculateAverageCdA();

    if (!isNaN(cdaTest1)) {
      const { distance: distance1, speed: speed1 } = calculateDistanceFromPowerAndTime(cdaTest1);
      const wattsPerCda1 = Math.round(power / cdaTest1);
      distanceResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">${test1Name}: ${cdaTest1.toFixed(4)} CdA</strong><br>
          Distance: ${distance1.toFixed(2)} km<br>
          Speed: ${speed1.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCda1} W/m²<br><br>
        </div>
      `);
    }
    if (!isNaN(cdaTest2)) {
      const { distance: distance2, speed: speed2 } = calculateDistanceFromPowerAndTime(cdaTest2);
      const wattsPerCda2 = Math.round(power / cdaTest2);
      distanceResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">${test2Name}: ${cdaTest2.toFixed(4)} CdA</strong><br>
          Distance: ${distance2.toFixed(2)} km<br>
          Speed: ${speed2.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCda2} W/m²<br><br>
        </div>
      `);
    }
    if (!isNaN(cdaTest3)) {
      const { distance: distance3, speed: speed3 } = calculateDistanceFromPowerAndTime(cdaTest3);
      const wattsPerCda3 = Math.round(power / cdaTest3);
      distanceResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">${test3Name}: ${cdaTest3.toFixed(4)} CdA</strong><br>
          Distance: ${distance3.toFixed(2)} km<br>
          Speed: ${speed3.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCda3} W/m²<br><br>
        </div>
      `);
    }
    if (distanceResults.length > 1) {
      const { distance: avgDistance, speed: avgSpeed } = calculateDistanceFromPowerAndTime(averageCdA);
      const wattsPerCdaAvg = Math.round(power / averageCdA);
      distanceResults.push(`
        <div class="result-item">
          <strong style="font-size: larger;">Average: ${averageCdA.toFixed(4)} CdA</strong><br>
          Distance: ${avgDistance.toFixed(2)} km<br>
          Speed: ${avgSpeed.toFixed(2)} km/h<br>
          Watts/CdA: ${wattsPerCdaAvg} W/m²<br><br>
        </div>
      `);
    }

    const result = `
      <div id="race-distance">
        <strong>Race Distance:</strong><br>
        <div><strong>Time:</strong> ${desiredTime}</div>
        <div><strong>Power:</strong> ${power} watts<br><br></div>
        <div class="result-group">
          ${distanceResults.join('')}
        </div>
      </div>
    `;

    displayResults(result);
  }
}

function displayResults(result) {
  const resultElement = document.getElementById('result');
  resultElement.innerHTML = result;
}

function parseTimeToSeconds(timeStr) {
  const mode = document.getElementById('calc-mode').value;
  let parts;
  let hours = 0, minutes = 0, seconds = 0;

  if (mode === 'race-distance' || parseFloat(document.getElementById('input-race-distance').value) >= 25) {
    parts = timeStr.split(':');
    if (parts.length === 1) {
      hours = parseInt(parts[0]) || 0;
    } else if (parts.length === 2) {
      hours = parseInt(parts[0]) || 0;
      minutes = parseInt(parts[1]) || 0;
    } else if (parts.length === 3) {
      hours = parseInt(parts[0]) || 0;
      minutes = parseInt(parts[1]) || 0;
      seconds = parseInt(parts[2]) || 0;
    }
  } else if (parseFloat(document.getElementById('input-race-distance').value) < 4 && parseFloat(document.getElementById('input-race-distance').value) > 0.5) {
    parts = timeStr.split(':');
    const subparts = parts[1] ? parts[1].split('.') : [0, 0];
    minutes = parseInt(parts[0]) || 0;
    seconds = parseInt(subparts[0]) || 0;
    milliseconds = parseInt(subparts[1]) || 0;
    return (minutes * 60) + seconds + (milliseconds / 100);
  } else if (parseFloat(document.getElementById('input-race-distance').value) <= 0.5) {
    parts = timeStr.split('.');
    seconds = parseInt(parts[0]) || 0;
    milliseconds = parseInt(parts[1]) || 0;
    return seconds + (milliseconds / 100);
  } else {
    parts = timeStr.split(':');
    minutes = parseInt(parts[0]) || 0;
    seconds = parseInt(parts[1]) || 0;
  }

  return (hours * 3600) + (minutes * 60) + seconds;
}

function formatRaceTime(timeSeconds) {
  const timeHours = Math.floor(timeSeconds / 3600);
  const timeMinutes = Math.floor((timeSeconds % 3600) / 60);
  const timeSecondsRemaining = (timeSeconds % 60).toFixed(timeSeconds < 300 ? 2 : 0);

  if (timeHours >= 10) {
    return `${timeHours.toString().padStart(2, '0')}:${timeMinutes.toString().padStart(2, '0')}:${timeSecondsRemaining.toString().padStart(2, '0')}`;
  } else if (timeHours > 0) {
    return `${timeHours}:${timeMinutes.toString().padStart(2, '0')}:${timeSecondsRemaining.toString().padStart(2, '0')}`;
  } else if (timeSeconds < 300) {
    return `${timeMinutes}:${timeSecondsRemaining}`;
  } else {
    return `${timeMinutes}:${timeSecondsRemaining.toString().padStart(2, '0')}`;
  }
}

function calculateRaceTime(CdA) {
  const raceDistance = parseFloat(document.getElementById('input-race-distance').value) * 1000;
  const power = parseFloat(document.getElementById('race-power').value);
  const airDensity = parseFloat(document.getElementById('race-air-density').value);
  const crr = parseFloat(document.getElementById('race-crr').value);
  const windSpeed = parseFloat(document.getElementById('race-wind-speed').value) / 3.6;
  const windAngle = parseFloat(document.getElementById('race-wind-angle').value) * (Math.PI / 180);
  const gradient = parseFloat(document.getElementById('race-gradient').value) / 100;
  const weight = parseFloat(document.getElementById('weight-race').value);
  const bikeWeight = parseFloat(document.getElementById('bike-weight-race').value);
  const totalWeight = weight + bikeWeight;
  const g = 9.80665;
  const drivetrainEfficiency = parseFloat(document.getElementById('drivetrain_efficiency-race').value);
  const P_eff = power * drivetrainEfficiency;
  const rho = airDensity;

  const F_rr = crr * totalWeight * g;
  const F_elev = totalWeight * g * gradient;

  function apparentWindSpeed(v, windSpeed, windAngle) {
    return Math.sqrt(Math.pow(v, 2) + Math.pow(windSpeed, 2) + 2 * v * windSpeed * Math.cos(windAngle));
  }

  const a = 0.5 * rho * CdA;
  const b = F_rr + F_elev;
  const c = -P_eff;

  function solve_newton_raphson(a, b, c, wind_speed, wind_angle, initial_guess = 10, iterations = 1000, tol = 1e-6) {
    let v = initial_guess;
    for (let i = 0; i < iterations; i++) {
      const apparent_wind = apparentWindSpeed(v, wind_speed, wind_angle);
      const P_aero = a * Math.pow(apparent_wind, 3);
      const P_rr = b * v;
      const F = P_aero + P_rr - P_eff;
      const dFdv = 3 * a * Math.pow(apparent_wind, 2) * v + b;
      const v_new = v - F / dFdv;
      if (Math.abs(v_new - v) < tol) {
        return v_new;
      }
      v = v_new;
    }
    return NaN;
  }

  const speed = solve_newton_raphson(a, b, c, windSpeed, windAngle);
  const timeSeconds = raceDistance / speed;
  return { time: timeSeconds, speed: (speed * 3.6) }; // speed in km/h
}

function calculateRequiredPower(CdA) {
  const raceDistance = parseFloat(document.getElementById('input-race-distance').value) * 1000;
  const desiredTime = parseTimeToSeconds(document.getElementById('desired-time').value);
  const airDensity = parseFloat(document.getElementById('race-air-density').value);
  const crr = parseFloat(document.getElementById('race-crr').value);
  const windSpeed = parseFloat(document.getElementById('race-wind-speed').value) / 3.6;
  const windAngle = parseFloat(document.getElementById('race-wind-angle').value) * (Math.PI / 180);
  const gradient = parseFloat(document.getElementById('race-gradient').value) / 100;
  const weight = parseFloat(document.getElementById('weight-race').value);
  const bikeWeight = parseFloat(document.getElementById('bike-weight-race').value);
  const totalWeight = weight + bikeWeight;
  const g = 9.80665;
  const drivetrainEfficiency = parseFloat(document.getElementById('drivetrain_efficiency-race').value); // Adjust drivetrain efficiency
  const rho = airDensity;

  const targetSpeed = raceDistance / desiredTime;

  const F_rr = crr * totalWeight * g;
  const F_elev = totalWeight * g * gradient;

  function apparentWindSpeed(v, windSpeed, windAngle) {
    return Math.sqrt(Math.pow(v, 2) + Math.pow(windSpeed, 2) + 2 * v * windSpeed * Math.cos(windAngle));
  }

  const apparentWind = apparentWindSpeed(targetSpeed, windSpeed, windAngle);
  const P_aero = 0.5 * rho * CdA * Math.pow(apparentWind, 3);
  const P_rr = F_rr * targetSpeed;
  const P_elev = F_elev * targetSpeed;
  const P_eff = P_aero + P_rr + P_elev;
  const requiredPower = P_eff / drivetrainEfficiency;

  return { power: requiredPower, speed: targetSpeed * 3.6 }; // speed in km/h
}

function calculateDistanceFromPowerAndTime(CdA) {
  const desiredTime = parseTimeToSeconds(document.getElementById('desired-time').value);
  const power = parseFloat(document.getElementById('race-power').value);
  const airDensity = parseFloat(document.getElementById('race-air-density').value);
  const crr = parseFloat(document.getElementById('race-crr').value);
  const windSpeed = parseFloat(document.getElementById('race-wind-speed').value) / 3.6;
  const windAngle = parseFloat(document.getElementById('race-wind-angle').value) * (Math.PI / 180);
  const gradient = parseFloat(document.getElementById('race-gradient').value) / 100;
  const weight = parseFloat(document.getElementById('weight-race').value);
  const bikeWeight = parseFloat(document.getElementById('bike-weight-race').value);
  const totalWeight = weight + bikeWeight;
  const g = 9.80665;
  const drivetrainEfficiency = parseFloat(document.getElementById('drivetrain_efficiency-race').value);
  const P_eff = power * drivetrainEfficiency;
  const rho = airDensity;

  if (isNaN(desiredTime) || isNaN(power) || isNaN(airDensity) || isNaN(crr) || isNaN(windSpeed) || isNaN(windAngle) || isNaN(gradient) || isNaN(weight) || isNaN(bikeWeight) || isNaN(drivetrainEfficiency)) {
    return { distance: NaN, speed: NaN };
  }

  const F_rr = crr * totalWeight * g;
  const F_elev = totalWeight * g * gradient;

  function apparentWindSpeed(v, windSpeed, windAngle) {
    return Math.sqrt(Math.pow(v, 2) + Math.pow(windSpeed, 2) + 2 * v * windSpeed * Math.cos(windAngle));
  }

  const a = 0.5 * rho * CdA;
  const b = F_rr + F_elev;
  const c = -P_eff;

  function solve_newton_raphson(a, b, c, wind_speed, wind_angle, initial_guess = 10, iterations = 1000, tol = 1e-6) {
    let v = initial_guess;
    for (let i = 0; i < iterations; i++) {
      const apparent_wind = apparentWindSpeed(v, wind_speed, wind_angle);
      const P_aero = a * Math.pow(apparent_wind, 3);
      const P_rr = b * v;
      const F = P_aero + P_rr - P_eff;
      const dFdv = 3 * a * Math.pow(apparent_wind, 2) * v + b;
      const v_new = v - F / dFdv;
      if (Math.abs(v_new - v) < tol) {
        return v_new;
      }
      v = v_new;
    }
    return NaN;
  }

  const speed = solve_newton_raphson(a, b, c, windSpeed, windAngle);
  const distanceMeters = speed * desiredTime;
  return { distance: distanceMeters / 1000, speed: speed * 3.6 }; // distance in km, speed in km/h
}

window.onload = function() {
  updateCdAResults();
  toggleCalculationMode();
};

function updateCdAResults() {
  const cdaTest1Element = document.getElementById('cdaResults-test1') ? document.getElementById('cdaResults-test1').innerText.split(': ') : null;
  const cdaTest2Element = document.getElementById('cdaResults-test2') ? document.getElementById('cdaResults-test2').innerText.split(': ') : null;
  const cdaTest3Element = document.getElementById('cdaResults-test3') ? document.getElementById('cdaResults-test3').innerText.split(': ') : null;
  const averageCdAElement = document.getElementById('cdaResults-average') ? document.getElementById('cdaResults-average').innerText.split(': ') : null;

  const cdaTest1 = cdaTest1Element ? parseFloat(cdaTest1Element[1]) : NaN;
  const cdaTest2 = cdaTest2Element ? parseFloat(cdaTest2Element[1]) : NaN;
  const cdaTest3 = cdaTest3Element ? parseFloat(cdaTest3Element[1]) : NaN;
  const averageCdA = averageCdAElement ? parseFloat(averageCdAElement[1]) : NaN;

  if (!isNaN(cdaTest1)) document.getElementById('cda-test1').value = cdaTest1.toFixed(4);
  if (!isNaN(cdaTest2)) document.getElementById('cda-test2').value = cdaTest2.toFixed(4);
  if (!isNaN(cdaTest3)) document.getElementById('cda-test3').value = cdaTest3.toFixed(4);
  if (!isNaN(averageCdA)) document.getElementById('cda-average').value = averageCdA.toFixed(4);

  document.getElementById('weight-race').value = document.getElementById('weight-cda').value;
  document.getElementById('bike-weight-race').value = document.getElementById('bike_weight-cda').value;
}

document.querySelectorAll('input').forEach(input => {
  input.addEventListener('input', calculate);
});



    const constantPower = 500;
    const colors = {
        test1: 'rgba(255, 99, 132, 1)',
        test2: 'rgba(54, 162, 235, 1)',
        test3: 'rgba(75, 192, 192, 1)'
    };

    function updateSliderValue(sliderId, displayId) {
        const slider = document.getElementById(sliderId);
        const display = document.getElementById(displayId);
        display.textContent = slider.value + (sliderId === 'gradient-ps' ? '%' : sliderId === 'wind-angle-ps' ? '°' : ' km/h');
    }

    function calculateSpeedFromPower() {
        const weight = parseFloat(document.getElementById('weight-ps').value);
        const bikeWeight = parseFloat(document.getElementById('bike-weight-ps').value);
        const airDensity = parseFloat(document.getElementById('race-air-density-ps').value);
        const crr = parseFloat(document.getElementById('race-crr-ps').value);
        const windSpeedKmh = parseFloat(document.getElementById('wind-speed-ps').value);
        const windSpeed = windSpeedKmh / 3.6; // Convert km/h to m/s
        const gradient = parseFloat(document.getElementById('gradient-ps').value) / 100;
        const windAngle = parseFloat(document.getElementById('wind-angle-ps').value);

        const cdaTest1 = parseFloat(document.getElementById('cda-ps-test1').value);
        const cdaTest2 = parseFloat(document.getElementById('cda-ps-test2').value);
        const cdaTest3 = parseFloat(document.getElementById('cda-ps-test3').value);

        const totalWeight = weight + bikeWeight;
        const cdaValues = [cdaTest1, cdaTest2, cdaTest3].filter(value => !isNaN(value));

        if (cdaValues.length === 0) {
            displaySpeedResults([]);
            return;
        }

        const speeds = cdaValues.map(cda => calculateSpeedAtPowerPS(constantPower, cda, airDensity, crr, totalWeight, windSpeed, gradient, windAngle));

        displaySpeedResults(speeds, cdaValues);
        displaySpeedVsPowerGraphPS(cdaValues, airDensity, crr, totalWeight, windSpeed, gradient, windAngle);
    }

    function calculateSpeedAtPowerPS(power, CdA, airDensity, crr, totalWeight, windSpeed, gradient, windAngle) {
        const g = 9.80665;
        const drivetrainEfficiency = parseFloat(document.getElementById('drivetrain_efficiency-ps').value); // Updated to use selected drivetrain efficiency
        const P_eff = power * drivetrainEfficiency;

        const F_rr = crr * totalWeight * g;
        const F_gravity = totalWeight * g * gradient;

        function apparentWindSpeed(v) {
            return v + windSpeed * Math.cos(windAngle * Math.PI / 180);
        }

        const a = 0.5 * airDensity * CdA;
        const b = F_rr + F_gravity;
        const c = -P_eff;

        function solveNewtonRaphson(a, b, c, initial_guess = 10, iterations = 1000, tol = 1e-6) {
            let v = initial_guess;
            for (let i = 0; i < iterations; i++) {
                const apparent_wind = apparentWindSpeed(v);
                const P_aero = a * Math.pow(apparent_wind, 3);
                const P_rr = b * v;
                const F = P_aero + P_rr - P_eff;
                const dFdv = 3 * a * Math.pow(apparent_wind, 2) * v + b;
                const v_new = v - F / dFdv;
                if (Math.abs(v_new - v) < tol) {
                    return v_new;
                }
                v = v_new;
            }
            return NaN;
        }

        const speed = solveNewtonRaphson(a, b, c);
        return speed * 3.6; // Convert m/s to km/h
    }

    function displaySpeedResults(speeds, cdaValues) {
        const speedResultElement = document.getElementById('speed-result-ps');
        let resultHTML = "<strong>Speed Results:</strong><br>";

        speeds.forEach((speed, index) => {
            resultHTML += `CdA ${cdaValues[index]}: ${speed.toFixed(2)} km/h<br>`;
        });

        speedResultElement.innerHTML = resultHTML;
    }

    function displaySpeedVsPowerGraphPS(cdaValues, airDensity, crr, totalWeight, windSpeed, gradient, windAngle) {
        const oldCanvas = document.getElementById('powerToSpeedChart');
        if (oldCanvas) {
            oldCanvas.remove();
        }

        const canvas = document.createElement('canvas');
        canvas.id = 'powerToSpeedChart';
        canvas.style.backgroundColor = 'white';
        document.querySelector('.results-container-ps').appendChild(canvas);

        const ctx = canvas.getContext('2d');

        const maxPower = 1500;

        const powers = [];
        const datasets = cdaValues.map((cda, index) => {
            const speeds = [];
            for (let power = 0; power <= maxPower; power += 10) {
                if (index === 0) powers.push(power); // Ensure powers are pushed only once
                speeds.push(calculateSpeedAtPowerPS(power, cda, airDensity, crr, totalWeight, windSpeed, gradient, windAngle));
            }
            return {
                label: `CdA ${cda}`,
                data: speeds,
                borderColor: `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 1)`,
                borderWidth: 2,
                fill: false
            };
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: powers,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Power (Watts)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Speed (km/h)'
                        },
                        min: 0,
                        max: 80,
                        ticks: {
                            stepSize: 5
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `${context[0].label} W`;
                            },
                            label: function(context) {
                                const dataset = context.dataset;
                                const dataIndex = context.dataIndex;
                                const speed = dataset.data[dataIndex];
                                const cda = dataset.label.split(' ')[1];
                                return `${speed.toFixed(1)} km/h\nCdA: ${cda}`;
                            }
                        }
                    }
                }
            }
        });
    }

    window.addEventListener('DOMContentLoaded', (event) => {
        calculateSpeedFromPower();
    });

}); // End of DOMContentLoaded wrapper
