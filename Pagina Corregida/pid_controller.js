document.addEventListener('DOMContentLoaded', () => {
    const kpInput = document.getElementById('kp');
    const kiInput = document.getElementById('ki');
    const kdInput = document.getElementById('kd');
    const setpointInput = document.getElementById('setpoint');
    const timeStepInput = document.getElementById('timeStep');
    const simulationTimeInput = document.getElementById('simulationTime');
    const simulateBtn = document.getElementById('simulateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const themeToggleBtn = document.getElementById('themeToggle');
    const overshootOutput = document.getElementById('overshoot');
    const riseTimeOutput = document.getElementById('riseTime');
    const peakTimeOutput = document.getElementById('peakTime');
    const settlingTimeOutput = document.getElementById('settlingTime');
    const steadyStateErrorOutput = document.getElementById('steadyStateError');

    const ctx = document.getElementById('responseChart').getContext('2d');
    let responseChart;

    const g = 9.8; // Aceleración de la gravedad
    const L = 1.0; // Longitud del péndulo (si fuera un péndulo)
    let theta = 0;
    let omega = 0;
    let integralError = 0;
    let previousError = 0;
    let time = 0;
    const timeHistory = [];
    const systemOutputHistory = [];
    const controlSignalHistory = [];
    const referenceSignalHistory = [];

    // Lógica para simular el controlador PID
    function simulatePID() {
        const kp = parseFloat(kpInput.value);
        const ki = parseFloat(kiInput.value);
        const kd = parseFloat(kdInput.value);
        const setpoint = parseFloat(setpointInput.value);
        const timeStep = parseFloat(timeStepInput.value);
        const simulationTime = parseFloat(simulationTimeInput.value);

        // Validación mejorada de los inputs
        if (
            !isFinite(kp) ||
            !isFinite(ki) ||
            !isFinite(kd) ||
            !isFinite(setpoint) ||
            !isFinite(timeStep) ||
            !isFinite(simulationTime) ||
            timeStep <= 0 ||
            simulationTime <= 0
        ) {
            alert('Por favor, ingrese valores numéricos válidos y positivos para el paso de tiempo y la duración.');
            return;
        }

        // Resetear variables de simulación
        theta = 0;
        omega = 0;
        integralError = 0;
        previousError = 0;
        time = 0;
        timeHistory.length = 0;
        systemOutputHistory.length = 0;
        controlSignalHistory.length = 0;
        referenceSignalHistory.length = 0;

        for (let i = 0; i < simulationTime / timeStep; i++) {
            const error = setpoint - theta;
            integralError += error * timeStep;
            const derivativeError = (error - previousError) / timeStep;
            previousError = error;

            const controlSignal = kp * error + ki * integralError + kd * derivativeError;
            controlSignalHistory.push(controlSignal);

            const alpha = (-g / L) * theta + controlSignal;
            omega += alpha * timeStep;
            theta += omega * timeStep;

            time += timeStep;
            timeHistory.push(time);
            systemOutputHistory.push(theta);
            referenceSignalHistory.push(setpoint);
        }

        plotResults();
        calculateMetrics();
    }

    // Lógica para graficar los resultados con Chart.js
    function plotResults() {
        const rootStyle = getComputedStyle(document.documentElement);
        const chartTextColor = rootStyle.getPropertyValue('--chart-text-color');
        const chartGridColor = rootStyle.getPropertyValue('--chart-grid-color');
        const primaryColor = rootStyle.getPropertyValue('--primary-color');
        const secondaryColor = rootStyle.getPropertyValue('--secondary-color');
        const borderColor = rootStyle.getPropertyValue('--border-color');

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            stacked: false,
            scales: {
                x: {
                    title: { display: true, text: 'Tiempo (s)', color: chartTextColor },
                    ticks: { color: chartTextColor },
                    grid: { color: chartGridColor },
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Respuesta del Sistema', color: chartTextColor },
                    ticks: { color: chartTextColor },
                    grid: { color: chartGridColor },
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Señal de Control', color: chartTextColor },
                    ticks: { color: chartTextColor },
                    grid: { drawOnChartArea: false },
                },
            },
            plugins: {
                legend: { labels: { color: chartTextColor } },
                zoom: {
                    pan: { enabled: true, mode: 'x' },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x',
                    },
                },
            },
        };

        if (responseChart) {
            responseChart.data.labels = timeHistory;
            responseChart.data.datasets[0].data = systemOutputHistory;
            responseChart.data.datasets[1].data = referenceSignalHistory;
            responseChart.data.datasets[2].data = controlSignalHistory;

            responseChart.options.scales.x.title.color = chartTextColor;
            responseChart.options.scales.x.ticks.color = chartTextColor;
            responseChart.options.scales.x.grid.color = chartGridColor;
            responseChart.options.scales.y.title.color = chartTextColor;
            responseChart.options.scales.y.ticks.color = chartTextColor;
            responseChart.options.scales.y.grid.color = chartGridColor;
            responseChart.options.scales.y1.title.color = chartTextColor;
            responseChart.options.scales.y1.ticks.color = chartTextColor;
            responseChart.options.plugins.legend.labels.color = chartTextColor;

            responseChart.update();
        } else {
            responseChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: timeHistory,
                    datasets: [
                        {
                            label: 'Salida del Sistema',
                            data: systemOutputHistory,
                            borderColor: primaryColor,
                            backgroundColor: 'transparent',
                            yAxisID: 'y',
                        },
                        {
                            label: 'Señal de Referencia',
                            data: referenceSignalHistory,
                            borderColor: secondaryColor,
                            backgroundColor: 'transparent',
                            borderDash: [5, 5],
                            yAxisID: 'y',
                        },
                        {
                            label: 'Señal de Control',
                            data: controlSignalHistory,
                            borderColor: borderColor,
                            backgroundColor: 'transparent',
                            yAxisID: 'y1',
                        },
                    ],
                },
                options: chartOptions,
            });
        }
    }

    // Lógica para calcular las métricas
    function calculateMetrics() {
        const setpoint = parseFloat(setpointInput.value);
        const systemOutput = systemOutputHistory;
        const time = timeHistory;

        // Overshoot
        const maxOutput = Math.max(...systemOutput);
        let overshoot = 0;
        if (maxOutput > setpoint) {
            overshoot = ((maxOutput - setpoint) / setpoint) * 100;
        }
        overshootOutput.textContent = overshoot.toFixed(2) + '%';

        // Rise Time (10-90%)
        let riseTime = 'N/A';
        const startValue = systemOutput[0];
        const endValue = setpoint;
        const tenPercentValue = startValue + 0.1 * (endValue - startValue);
        const ninetyPercentValue = startValue + 0.9 * (endValue - startValue);
        let time10 = -1;
        let time90 = -1;

        for (let i = 0; i < systemOutput.length; i++) {
            if (time10 === -1 && systemOutput[i] >= tenPercentValue) {
                time10 = time[i];
            }
            if (time90 === -1 && systemOutput[i] >= ninetyPercentValue) {
                time90 = time[i];
                break;
            }
        }
        if (time10 !== -1 && time90 !== -1) {
            riseTime = (time90 - time10).toFixed(2) + 's';
        }
        riseTimeOutput.textContent = riseTime;

        // Peak Time
        let peakTime = 'N/A';
        if (maxOutput > setpoint) {
            const maxIndex = systemOutput.indexOf(maxOutput);
            peakTime = time[maxIndex].toFixed(2) + 's';
        }
        peakTimeOutput.textContent = peakTime;

        // Settling Time
        let settlingTime = 'N/A';
        const tolerance = 0.02 * setpoint; // 2% tolerance band
        const upperBand = setpoint + tolerance;
        const lowerBand = setpoint - tolerance;
        let settled = false;

        for (let i = systemOutput.length - 1; i >= 0; i--) {
            if (systemOutput[i] >= lowerBand && systemOutput[i] <= upperBand) {
                settled = true;
            } else {
                if (settled) {
                    settlingTime = time[i + 1].toFixed(2) + 's';
                    break;
                }
            }
            if (i === 0 && settled) {
                settlingTime = time[0].toFixed(2) + 's';
            }
        }
        settlingTimeOutput.textContent = settlingTime;

        // Steady State Error
        const finalOutput = systemOutput[systemOutput.length - 1];
        const steadyStateError = setpoint - finalOutput;
        steadyStateErrorOutput.textContent = steadyStateError.toFixed(4);
    }

    // Resetea la simulación y los inputs a valores por defecto
    function resetSimulation() {
        if (responseChart) {
            responseChart.data.labels = [];
            responseChart.data.datasets[0].data = [];
            responseChart.data.datasets[1].data = [];
            responseChart.data.datasets[2].data = [];
            responseChart.update();
        }

        overshootOutput.textContent = 'N/A';
        riseTimeOutput.textContent = 'N/A';
        peakTimeOutput.textContent = 'N/A';
        settlingTimeOutput.textContent = 'N/A';
        steadyStateErrorOutput.textContent = 'N/A';

        kpInput.value = '1.0';
        kiInput.value = '0.5';
        kdInput.value = '0.2';
        setpointInput.value = '1.0';
        timeStepInput.value = '0.1';
        simulationTimeInput.value = '20.0';
    }

    // Alterna el tema de la página y actualiza el gráfico
    function themeToggle() {
        document.body.classList.toggle('light-theme');
        plotResults();
    }

    // Event Listeners
    simulateBtn.addEventListener('click', () => {
        simulateBtn.textContent = 'Simulando...';
        simulateBtn.disabled = true;
        setTimeout(() => {
            simulatePID();
            simulateBtn.textContent = 'Simular';
            simulateBtn.disabled = false;
        }, 10);
    });
    resetBtn.addEventListener('click', resetSimulation);
    themeToggleBtn.addEventListener('click', themeToggle);
});