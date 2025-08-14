/**
 * PID Control Simulator
 * This script provides the full functionality for an interactive PID control simulator,
 * including a dynamic system diagram, real-time plotting, and tuning tools.
 */

// Global variables to hold chart instances to prevent memory leaks
let responseChart = null;
let signalPreviewChart = null;

// Store simulation data globally for easy access by different functions
let simulationData = {};

// Almacena los datasets de comparación
let comparisonDatasets = [];

/**
 * Initializes the entire application after the DOM is fully loaded.
 * It sets up the diagram, event listeners, and runs an initial simulation.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa el diagrama SVG
    createPIDDiagram();

    // Configura todos los manejadores de eventos
    setupEventListeners();

    // Muestra la planta inicial y ejecuta la primera simulación
    updatePlantDisplay();
    runSimulation();

    // Inicia la animación automáticamente al cargar la página
    animateSignalFlow();
});

/**
 * Creates the interactive PID control loop diagram using SVG.
 * Each key component (arrows, blocks) is given a unique ID for interactivity.
 */
function createPIDDiagram() {
    const diagramContainer = document.getElementById('pidDiagram');
    if (!diagramContainer) return;

    const diagramSVG = `
        <svg viewBox="0 0 800 250" preserveAspectRatio="xMidYMid meet" class="w-full h-full">
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--diagram-text-color)"></path>
                </marker>
            </defs>

            <g class="signal-arrow" data-signal="reference" id="ref-signal">
                <line x1="20" y1="100" x2="100" y2="100" stroke="var(--diagram-text-color)" stroke-width="2" marker-end="url(#arrow)" />
                <text x="40" y="90" fill="var(--diagram-text-color)" font-size="14">R(s)</text>
            </g>

            <circle cx="125" cy="100" r="25" fill="none" stroke="var(--accent-color)" stroke-width="2" />
            <text x="120" y="95" fill="var(--diagram-text-color)" font-size="20">+</text>
            <text x="120" y="125" fill="var(--diagram-text-color)" font-size="20">-</text>

            <g class="signal-arrow" data-signal="error" id="error-signal">
                <line x1="150" y1="100" x2="220" y2="100" stroke="var(--diagram-text-color)" stroke-width="2" marker-end="url(#arrow)" />
                <text x="170" y="90" fill="var(--diagram-text-color)" font-size="14">E(s)</text>
            </g>

            <g id="pid-block-container">
                <rect x="220" y="60" width="160" height="80" fill="var(--card-bg)" stroke="var(--secondary-color)" stroke-width="2" rx="5" />
                <foreignObject x="225" y="65" width="150" height="70">
                    <div id="pid-controls-container" class="p-1 text-xs text-white">
                        <div class="flex items-center justify-between"><span>Kp:</span><input type="range" id="kpSlider" min="0" max="20" step="0.1" value="1" class="w-2/3"><span id="kpValue" class="w-1/4 text-right">1</span></div>
                        <div class="flex items-center justify-between"><span>Ki:</span><input type="range" id="kiSlider" min="0" max="10" step="0.1" value="0.5" class="w-2/3"><span id="kiValue" class="w-1/4 text-right">0.5</span></div>
                        <div class="flex items-center justify-between"><span>Kd:</span><input type="range" id="kdSlider" min="0" max="5" step="0.1" value="0.1" class="w-2/3"><span id="kdValue" class="w-1/4 text-right">0.1</span></div>
                    </div>
                </foreignObject>
            </g>

            <g class="signal-arrow" data-signal="control" id="control-signal">
                <line x1="380" y1="100" x2="450" y2="100" stroke="var(--diagram-text-color)" stroke-width="2" marker-end="url(#arrow)" />
                <text x="400" y="90" fill="var(--diagram-text-color)" font-size="14">U(s)</text>
            </g>

            <g id="plant-block-container">
                 <rect x="450" y="60" width="160" height="80" fill="var(--card-bg)" stroke="var(--secondary-color)" stroke-width="2" rx="5" />
                 <foreignObject x="455" y="65" width="150" height="70">
                    <div id="plant-display" class="w-full h-full flex flex-col items-center justify-center text-center p-1"></div>
                 </foreignObject>
            </g>

            <g class="signal-arrow" data-signal="output" id="output-signal">
                <line x1="610" y1="100" x2="700" y2="100" stroke="var(--diagram-text-color)" stroke-width="2" marker-end="url(#arrow)" />
                <text x="630" y="90" fill="var(--diagram-text-color)" font-size="14">Y(s)</text>
            </g>

            <path d="M 650 100 L 650 175 L 125 175 L 125 125" stroke="var(--diagram-text-color)" stroke-width="2" fill="none" marker-end="url(#arrow)" id="feedback-signal"/>
        </svg>
    `;
    diagramContainer.innerHTML = diagramSVG;
}

/**
 * Sets up all necessary event listeners for the UI components.
 */
function setupEventListeners() {
    // Main simulation buttons
    document.getElementById('runButton').addEventListener('click', runSimulation);
    document.getElementById('addComparison').addEventListener('click', addComparison);
    document.getElementById('clearComparisons').addEventListener('click', clearComparisons);

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        // Actualizar el gráfico cuando cambia el tema
        if (responseChart) {
            plotResults();
        }
    });

    // Help panel
    document.getElementById('helpToggle').addEventListener('click', () => {
        document.getElementById('helpPanel').classList.remove('hidden');
    });
    document.getElementById('closeHelp').addEventListener('click', () => {
        document.getElementById('helpPanel').classList.add('hidden');
    });

    // Save/Load configuration
    document.getElementById('saveConfig').addEventListener('click', saveConfig);
    document.getElementById('loadConfig').addEventListener('click', loadConfig);
    document.getElementById('plantModel').addEventListener('change', handlePlantModelChange);

    // PID and simulation parameter inputs
    ['simTime', 'dt', 'amplitude', 'frequency', 'antiWindup', 'derivativeFilter'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', runSimulation);
        }
    });

    // PID and disturbance sliders
    ['kp', 'ki', 'kd'].forEach(param => {
        const slider = document.getElementById(`${param}Slider`);
        const valueSpan = document.getElementById(`${param}Value`);
        const hiddenInput = document.getElementById(`${param}`);

        slider.addEventListener('input', () => {
            const val = slider.value;
            valueSpan.textContent = val;
            hiddenInput.value = val;
            runSimulation();
        });
    });

    const disturbanceSlider = document.getElementById('disturbance');
    disturbanceSlider.addEventListener('input', () => {
        document.getElementById('disturbanceValue').textContent = `${(disturbanceSlider.value * 100).toFixed(0)}%`;
        runSimulation();
    });

    // Plant parameter inputs
    document.getElementById('numerator').addEventListener('change', () => {
        updatePlantDisplay();
        runSimulation();
    });
    document.getElementById('denominator').addEventListener('change', () => {
        updatePlantDisplay();
        runSimulation();
    });

    // Reference signal configuration
    document.getElementById('controlType').addEventListener('change', handleControlTypeChange);

    // Sintonía de Ziegler-Nichols
    document.getElementById('startTuningButton').addEventListener('click', startZieglerNicholsTuning);
    document.getElementById('tuningKpSlider').addEventListener('input', handleZnKpChange);

    // Setup interactivity for the diagram arrows
    setupDiagramInteractivity();

    // Slider range inputs
    setupSliderRangeListeners();
}

/**
 * Sets up event listeners for the slider range input fields.
 * This function allows users to dynamically change the min/max of PID sliders.
 */
function setupSliderRangeListeners() {
    ['kp', 'ki', 'kd'].forEach(param => {
        const minInput = document.getElementById(`${param}Min`);
        const maxInput = document.getElementById(`${param}Max`);
        const slider = document.getElementById(`${param}Slider`);

        const updateRange = () => {
            const min = parseFloat(minInput.value);
            const max = parseFloat(maxInput.value);

            if (!isNaN(min) && !isNaN(max) && min <= max) {
                slider.min = min;
                slider.max = max;

                const currentValue = parseFloat(slider.value);
                if (currentValue < min || currentValue > max) {
                    slider.value = Math.max(min, Math.min(max, currentValue));
                    slider.dispatchEvent(new Event('input'));
                }
            } else {
                console.warn(`Invalid range for ${param}: min=${min}, max=${max}. Not applying.`);
            }
        };

        minInput.addEventListener('change', updateRange);
        maxInput.addEventListener('change', updateRange);
    });
}

/**
 * Handles changes to the reference signal type selector.
 */
function handleControlTypeChange() {
    const type = document.getElementById('controlType').value;
    const freqGroup = document.getElementById('frequencyGroup');
    freqGroup.style.display = (type === 'sine' || type === 'square') ? 'block' : 'none';
    runSimulation();
}

/**
 * Sets up mouseover/mouseout events on diagram arrows to show/hide signal plots.
 */
function setupDiagramInteractivity() {
    const previewContainer = document.getElementById('signalPreview');
    document.querySelectorAll('.signal-arrow').forEach(arrow => {
        arrow.addEventListener('mouseover', (e) => {
            const signalName = e.currentTarget.dataset.signal;
            if (simulationData[signalName]) {
                previewContainer.style.display = 'block';
                previewContainer.style.left = `${e.pageX + 15}px`;
                previewContainer.style.top = `${e.pageY - 100}px`;
                showSignalPlot(signalName);
            }
        });
        arrow.addEventListener('mouseout', () => {
            previewContainer.style.display = 'none';
            if (signalPreviewChart) {
                signalPreviewChart.destroy();
                signalPreviewChart = null;
            }
        });
    });
}

/**
 * Displays a small, focused plot for a specific signal.
 * @param {string} signalName - The name of the signal to plot (e.g., 'reference', 'error').
 */
function showSignalPlot(signalName) {
    const ctx = document.getElementById('signalPreviewChart').getContext('2d');
    if (signalPreviewChart) {
        signalPreviewChart.destroy();
    }

    const isLightTheme = document.body.classList.contains('light-theme');
    const signalColor = signalName === 'reference' ? (isLightTheme ? '#1e40af' : '#e0e7ff') :
                        signalName === 'error' ? (isLightTheme ? '#dc2626' : '#f87171') :
                        signalName === 'control' ? (isLightTheme ? '#7c3aed' : '#8b5cf6') :
                        (isLightTheme ? '#2563eb' : '#3b82f6');

    signalPreviewChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: simulationData.time,
            datasets: [{
                label: `${signalName.charAt(0).toUpperCase() + signalName.slice(1)} Signal`,
                data: simulationData[signalName],
                borderColor: signalColor,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: {
                    ticks: {
                        color: isLightTheme ? '#1e293b' : '#e0e7ff',
                        font: { size: 10 }
                    },
                    grid: {
                        color: isLightTheme ? 'rgba(30, 41, 59, 0.1)' : 'rgba(224, 231, 255, 0.2)'
                    }
                }
            },
            animation: { duration: 0 }
        }
    });
}

/**
 * Core simulation function. Gathers parameters, runs the simulation,
 * and triggers plotting and metric calculations.
 */
function runSimulation() {
    const loadingIndicator = document.getElementById('simulationLoading');
    loadingIndicator.classList.remove('hidden');

    // Get parameters from UI
    const numStr = document.getElementById('numerator').value;
    const denStr = document.getElementById('denominator').value;
    const kp = parseFloat(document.getElementById('kp').value);
    const ki = parseFloat(document.getElementById('ki').value);
    const kd = parseFloat(document.getElementById('kd').value);
    const simTime = parseFloat(document.getElementById('simTime').value);
    const dt = parseFloat(document.getElementById('dt').value);
    const controlType = document.getElementById('controlType').value;
    const amplitude = parseFloat(document.getElementById('amplitude').value);
    const frequency = parseFloat(document.getElementById('frequency').value);
    const antiWindupType = document.getElementById('antiWindup').value;
    const derivativeFilterType = document.getElementById('derivativeFilter').value;
    const disturbanceAmplitude = parseFloat(document.getElementById('disturbance').value);

    // Parse transfer function coefficients
    const numerator = numStr.split(',').map(s => parseFloat(s.trim()));
    const denominator = denStr.split(',').map(s => parseFloat(s.trim()));

    if (denominator.length === 0 || numerator.length === 0 || denominator.some(isNaN) || numerator.some(isNaN)) {
        console.error("Invalid transfer function coefficients.");
        loadingIndicator.classList.add('hidden');
        return;
    }

    // Convert TF to State-Space representation
    const { A, B, C, D } = tfToStateSpace(numerator, denominator);

    // Initialize simulation variables
    const steps = Math.floor(simTime / dt);
    const time = Array.from({ length: steps }, (_, i) => i * dt);
    let x = new Array(A.length).fill(0); // State vector
    let integral = 0;
    let prevError = 0;
    let filteredDerivative = 0;

    // Arrays to store results
    const reference = new Array(steps).fill(0);
    const output = new Array(steps).fill(0);
    const error = new Array(steps).fill(0);
    const control = new Array(steps).fill(0);

    // Main simulation loop
    for (let i = 0; i < steps; i++) {
        const t = time[i];

        // Generate reference signal
        reference[i] = generateReference(t, controlType, amplitude, frequency);

        // Calculate current system output
        let y_plant = C.reduce((sum, val, j) => sum + val * x[j], 0) + D * (control[i-1] || 0);

        // Add disturbance
        let y_disturbance = y_plant + (Math.random() - 0.5) * 2 * disturbanceAmplitude;
        output[i] = y_disturbance;

        // Calculate error
        const currentError = reference[i] - output[i]; // Error is calculated from the disturbed output
        error[i] = currentError;

        // PID controller logic
        integral += currentError * dt;

        let derivative;
        if (i > 0) {
            derivative = (currentError - prevError) / dt;
        } else {
            derivative = 0;
        }

        // Derivative Filter (first-order low-pass filter)
        if (derivativeFilterType === 'firstOrder') {
            const tau_d = 0.05; // Filter time constant (valor ajustado)
            const alpha = dt / (tau_d + dt);
            filteredDerivative = alpha * derivative + (1 - alpha) * filteredDerivative;
            derivative = filteredDerivative;
        }

        let u_unclamped = kp * currentError + ki * integral + kd * derivative;
        let u = u_unclamped;

        // Anti-Windup
        if (antiWindupType === 'clamping') {
            const u_max = 5;
            const u_min = -5;
            if (u > u_max) {
                u = u_max;
                if (u_unclamped > u_max) {
                    integral -= (u_unclamped - u) / ki;
                }
            } else if (u < u_min) {
                u = u_min;
                if (u_unclamped < u_min) {
                    integral -= (u_unclamped - u) / ki;
                }
            }
        }
        control[i] = u;

        prevError = currentError;

        // Update state vector using Runge-Kutta 4th order method
        x = rungeKutta(A, B, x, u, dt);
    }

    // Store all data for other functions to use
    simulationData = { time, reference, output, error, control };

    // Update UI
    plotResults();
    displayMetrics(simulationData);

    loadingIndicator.classList.add('hidden');
}

/**
 * Generates the reference signal for a given time `t`.
 * @param {number} t - Current time.
 * @param {string} type - Signal type ('step', 'ramp', 'sine', 'square').
 * @param {number} amp - Amplitude.
 * @param {number} freq - Frequency (for sine/square).
 * @returns {number} The value of the reference signal at time t.
 */
function generateReference(t, type, amp, freq) {
    switch (type) {
        case 'step': return amp;
        case 'ramp': return amp * t;
        case 'sine': return amp * Math.sin(2 * Math.PI * freq * t);
        case 'square': return amp * Math.sign(Math.sin(2 * Math.PI * freq * t));
        default: return amp;
    }
}

/**
 * Converts a Transfer Function to a State-Space representation (Controllable Canonical Form).
 * @param {number[]} num - Numerator coefficients.
 * @param {number[]} den - Denominator coefficients.
 * @returns {object} State-space matrices {A, B, C, D}.
 */
function tfToStateSpace(num, den) {
    const den_norm = den[0];
    if (den_norm === 0) throw new Error('Denominator highest order coefficient cannot be zero.');

    den = den.map(d => d / den_norm);
    num = num.map(n => n / den_norm);

    const n = den.length - 1;
    if (n < 0) throw new Error('Invalid denominator.');

    let num_padded = [...Array(n - num.length + 1).fill(0), ...num];

    const A = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n - 1; i++) A[i][i+1] = 1;
    for (let i = 0; i < n; i++) A[n-1][i] = -den[n-i];

    const B = new Array(n).fill(0);
    B[n-1] = 1;

    const C = num_padded.slice(1);
    const D = num_padded[0];

    return { A, B, C, D };
}

/**
 * 4th Order Runge-Kutta method for integrating state-space systems.
 * @param {number[][]} A - State matrix.
 * @param {number[]} B - Input matrix.
 * @param {number[]} x - Current state vector.
 * @param {number} u - Current input signal.
 * @param {number} dt - Time step.
 * @returns {number[]} The new state vector.
 */
function rungeKutta(A, B, x, u, dt) {
    const n = x.length;
    const f = (x_vec) => {
        const res = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                res[i] += A[i][j] * x_vec[j];
            }
            res[i] += B[i] * u;
        }
        return res;
    };

    const k1 = f(x).map(v => v * dt);
    const k2 = f(x.map((v, i) => v + 0.5 * k1[i])).map(v => v * dt);
    const k3 = f(x.map((v, i) => v + 0.5 * k2[i])).map(v => v * dt);
    const k4 = f(x.map((v, i) => v + k3[i])).map(v => v * dt);

    return x.map((v, i) => v + (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
}

/**
 * Plots the main simulation results on the primary chart.
 */
function plotResults() {
    const { time, reference, output, control } = simulationData;
    const ctx = document.getElementById('responseChart').getContext('2d');

    // Determinar colores basados en el tema actual
    const isLightTheme = document.body.classList.contains('light-theme');
    const refColor = isLightTheme ? '#1e40af' : '#e0e7ff';
    const outputColor = isLightTheme ? '#2563eb' : '#3b82f6';
    const controlColor = isLightTheme ? '#7c3aed' : '#8b5cf6';
    const gridColor = isLightTheme ? 'rgba(30, 41, 59, 0.1)' : 'rgba(224, 231, 255, 0.2)';
    const textColor = isLightTheme ? '#1e293b' : '#e0e7ff';

    const datasets = [
        ...comparisonDatasets,
        {
            label: 'Señal de Referencia',
            data: reference,
            borderColor: refColor,
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            yAxisID: 'y'
        },
        {
            label: 'Salida del Sistema',
            data: output,
            borderColor: outputColor,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: false,
            borderWidth: 3,
            pointRadius: 0,
            yAxisID: 'y'
        },
        {
            label: 'Señal de Control',
            data: control,
            borderColor: controlColor,
            borderWidth: 2,
            pointRadius: 0,
            hidden: true,
            yAxisID: 'y1'
        }
    ];

    if (responseChart) {
        responseChart.data.labels = time;
        responseChart.data.datasets = datasets;
        responseChart.options.scales.x.grid.color = gridColor;
        responseChart.options.scales.y.grid.color = gridColor;
        responseChart.options.scales.x.ticks.color = textColor;
        responseChart.options.scales.y.ticks.color = textColor;
        responseChart.options.scales.y1.ticks.color = textColor;
        responseChart.options.plugins.legend.labels.color = textColor;
        responseChart.update();
    } else {
        responseChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: time,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Tiempo (s)',
                            color: textColor
                        },
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    y: {
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Respuesta del Sistema',
                            color: textColor
                        },
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    y1: {
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Señal de Control',
                            color: textColor
                        },
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: textColor,
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: isLightTheme ? 'rgba(248, 250, 252, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                        titleColor: isLightTheme ? '#1e40af' : '#3b82f6',
                        bodyColor: textColor,
                        borderColor: isLightTheme ? '#e2e8f0' : '#1e293b',
                        borderWidth: 1
                    }
                }
            }
        });
    }
}

/**
 * Agrega la simulación actual como un dataset de comparación.
 */
const addComparison = () => {
    if (!simulationData.output || simulationData.output.length === 0) {
        alert("Ejecuta una simulación primero.");
        return;
    }

    const kp = document.getElementById('kp').value;
    const ki = document.getElementById('ki').value;
    const kd = document.getElementById('kd').value;
    const randomColor = `hsl(${Math.random() * 360}, 100%, 50%)`;

    comparisonDatasets.push({
        label: `Comparación (Kp=${kp}, Ki=${ki}, Kd=${kd})`,
        data: [...simulationData.output],
        borderColor: randomColor,
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y',
        fill: false
    });

    plotResults(); // Repinta el gráfico con la nueva comparación
};

/**
 * Limpia todos los datasets de comparación del gráfico.
 */
const clearComparisons = () => {
    comparisonDatasets = [];
    plotResults();
};

/**
 * Calculates and displays key performance metrics from the simulation data.
 * @param {object} data - The simulation data object.
 */
function displayMetrics(data) {
    const { time, output, reference } = data;

    // Métricas del sistema
    let overshoot = 0;
    let settlingTime = '-';
    let riseTime = '-';
    let steadyStateError = '-';

    const finalValue = reference[reference.length - 1];
    const peakValue = Math.max(...output);

    if (finalValue > 0) {
        overshoot = (peakValue - finalValue) / finalValue * 100;
        if (overshoot < 0) overshoot = 0; // No overshoot si es menor que el valor final
    }

    // Calcular Settling Time (criterio 5%)
    const tolerance = 0.05 * finalValue;
    let isSettling = false;
    for (let i = output.length - 1; i >= 0; i--) {
        if (Math.abs(output[i] - finalValue) > tolerance) {
            settlingTime = time[i];
            isSettling = true;
            break;
        }
    }
    if (!isSettling) settlingTime = time[time.length - 1]; // si no se estabiliza

    // Calcular Rise Time (10% a 90%)
    let t10 = -1, t90 = -1;
    const val10 = 0.1 * finalValue;
    const val90 = 0.9 * finalValue;
    for (let i = 0; i < output.length; i++) {
        if (t10 === -1 && output[i] >= val10) t10 = time[i];
        if (t90 === -1 && output[i] >= val90) t90 = time[i];
        if (t10 !== -1 && t90 !== -1) break;
    }
    if (t10 !== -1 && t90 !== -1) {
        riseTime = t90 - t10;
    } else {
        riseTime = "-";
    }

    // Calcular Steady State Error
    const lastOutputValue = output[output.length - 1];
    steadyStateError = Math.abs(finalValue - lastOutputValue);

    document.getElementById('overshoot').textContent = overshoot.toFixed(1) + '%';
    document.getElementById('riseTime').textContent = riseTime !== '-' ? `${riseTime.toFixed(2)}s` : '-';
    document.getElementById('settlingTime').textContent = settlingTime !== '-' ? `${settlingTime.toFixed(2)}s` : '-';
    document.getElementById('steadyStateError').textContent = steadyStateError.toFixed(2);
}

/**
 * Updates the plant block in the diagram to display a nicely formatted transfer function.
 */
function updatePlantDisplay() {
    const numStr = document.getElementById('numerator').value;
    const denStr = document.getElementById('denominator').value;
    const numerator = numStr.split(',').map(s => s.trim());
    const denominator = denStr.split(',').map(s => s.trim());

    // Genera la representación de la función de transferencia
    const num_html = numerator.length > 1 ? `(${numerator.join('s + ')})` : numerator[0];
    const den_html = denominator.length > 1 ? `(${denominator.join('s + ')})` : denominator[0];

    const plantDisplay = document.getElementById('plant-display');
    plantDisplay.innerHTML = `
        <div class="text-xs text-center text-blue-300">G(s) =</div>
        <div class="text-sm font-semibold text-white mt-1">
            <span class="numerator-display">${num_html}</span>
            <hr class="border-white my-0.5" />
            <span class="denominator-display">${den_html}</span>
        </div>
    `;
}

/**
 * Maneja el cambio de modelo de planta predefinido.
 */
function handlePlantModelChange() {
    const model = document.getElementById('plantModel').value;
    const numInput = document.getElementById('numerator');
    const denInput = document.getElementById('denominator');
    const customParamsDiv = document.getElementById('customPlantParams');

    switch (model) {
        case 'motorDC':
            numInput.value = '1';
            denInput.value = '1, 10, 20';
            customParamsDiv.classList.remove('hidden');
            break;
        case 'termico':
            numInput.value = '1';
            denInput.value = '10, 1';
            customParamsDiv.classList.remove('hidden');
            break;
        case 'masa-resorte':
            numInput.value = '1';
            denInput.value = '1, 0.5, 1';
            customParamsDiv.classList.remove('hidden');
            break;
        case 'tanque':
            numInput.value = '1';
            denInput.value = '10, 1';
            customParamsDiv.classList.remove('hidden');
            break;
        case 'custom':
            customParamsDiv.classList.remove('hidden');
            break;
    }
    updatePlantDisplay();
    runSimulation();
}

/**
 * Guarda la configuración de la planta y el PID en localStorage.
 */
function saveConfig() {
    const config = {
        numerator: document.getElementById('numerator').value,
        denominator: document.getElementById('denominator').value,
        kp: document.getElementById('kpSlider').value,
        ki: document.getElementById('kiSlider').value,
        kd: document.getElementById('kdSlider').value,
        simTime: document.getElementById('simTime').value,
        dt: document.getElementById('dt').value,
        controlType: document.getElementById('controlType').value,
        amplitude: document.getElementById('amplitude').value,
        frequency: document.getElementById('frequency').value,
        antiWindup: document.getElementById('antiWindup').value,
        derivativeFilter: document.getElementById('derivativeFilter').value,
        disturbance: document.getElementById('disturbance').value,
    };
    localStorage.setItem('pidConfig', JSON.stringify(config));
    alert('Configuración guardada!');
}

/**
 * Carga la configuración desde localStorage y actualiza la interfaz.
 */
function loadConfig() {
    const savedConfig = localStorage.getItem('pidConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);

        document.getElementById('numerator').value = config.numerator;
        document.getElementById('denominator').value = config.denominator;
        document.getElementById('kpSlider').value = config.kp;
        document.getElementById('kiSlider').value = config.ki;
        document.getElementById('kdSlider').value = config.kd;
        document.getElementById('simTime').value = config.simTime;
        document.getElementById('dt').value = config.dt;
        document.getElementById('controlType').value = config.controlType;
        document.getElementById('amplitude').value = config.amplitude;
        document.getElementById('frequency').value = config.frequency;
        document.getElementById('antiWindup').value = config.antiWindup;
        document.getElementById('derivativeFilter').value = config.derivativeFilter;
        document.getElementById('disturbance').value = config.disturbance;

        // Actualizar valores de display
        document.getElementById('kpValue').textContent = config.kp;
        document.getElementById('kiValue').textContent = config.ki;
        document.getElementById('kdValue').textContent = config.kd;
        document.getElementById('disturbanceValue').textContent = `${(config.disturbance * 100).toFixed(0)}%`;

        handleControlTypeChange();
        updatePlantDisplay();
        runSimulation();
        alert('Configuración cargada!');
    } else {
        alert('No se encontró ninguna configuración guardada.');
    }
}

/**
 * Inicia el proceso de sintonía de Ziegler-Nichols.
 */
function startZieglerNicholsTuning() {
    document.getElementById('tuningControls').classList.remove('hidden');
    document.getElementById('tuningKpSlider').value = 0;
    document.getElementById('tuningKpValue').textContent = '0';
    document.getElementById('kuValue').textContent = '-';
    document.getElementById('tuValue').textContent = '-';
}

/**
 * Maneja los cambios del slider de Kp para la sintonía de Z-N.
 */
function handleZnKpChange() {
    const kp = parseFloat(document.getElementById('tuningKpSlider').value);
    document.getElementById('tuningKpValue').textContent = kp.toFixed(1);

    // Aquí iría la lógica para encontrar Ku y Tu
    // Por ahora solo actualizamos los valores de ejemplo
    if (kp > 5) {
        document.getElementById('kuValue').textContent = kp.toFixed(1);
        document.getElementById('tuValue').textContent = (2.5 + Math.random()).toFixed(2);
    }
}

/**
 * Analiza la señal de salida para encontrar el período de oscilación (Tu).
 * @param {number[]} output - Los datos de salida del sistema.
 * @param {number[]} time - Los datos de tiempo.
 */
function findTu(output, time) {
    // Implementación básica para encontrar el período de oscilación
    // Esto debería mejorarse con un algoritmo más robusto
    let peaks = [];
    let prevValue = output[0];
    let rising = false;

    for (let i = 1; i < output.length; i++) {
        if (output[i] > prevValue) {
            rising = true;
        } else if (output[i] < prevValue && rising) {
            peaks.push(time[i]);
            rising = false;
        }
        prevValue = output[i];
    }

    if (peaks.length >= 2) {
        return peaks[peaks.length - 1] - peaks[peaks.length - 2];
    }
    return 0;
}

/**
 * Sugiere parámetros PID basados en Ku y Tu usando las reglas clásicas de Z-N.
 * @param {number} Ku - Ganancia Última.
 * @param {number} Tu - Período Último.
 */
function suggestZNPIDValues(Ku, Tu) {
    const tuningMethod = document.getElementById('tuningMethod').value;
    let kp, ki, kd;

    switch (tuningMethod) {
        case 'ziegler-nichols':
            kp = 0.6 * Ku;
            ki = 1.2 * Ku / Tu;
            kd = 0.075 * Ku * Tu;
            break;
        case 'cohen-coon':
            kp = (0.9 * Ku) / 1.35;
            ki = (1.35 * Ku) / (2.5 * Tu);
            kd = (0.27 * Ku * Tu) / 1.35;
            break;
        case 'imc':
            kp = 0.5 * Ku;
            ki = 0.5 * Ku / Tu;
            kd = 0.125 * Ku * Tu;
            break;
        default:
            kp = 0.6 * Ku;
            ki = 1.2 * Ku / Tu;
            kd = 0.075 * Ku * Tu;
    }

    return { kp, ki, kd };
}

/**
 * Crea una animación visual del flujo de señal en el diagrama.
 */
function animateSignalFlow() {
    const arrows = document.querySelectorAll('.signal-arrow line, #feedback-signal');

    // Elimina la clase de animación para resetearla
    arrows.forEach(arrow => arrow.classList.remove('animated-arrow'));

    // Vuelve a añadir la clase de animación para que se reinicie
    setTimeout(() => {
        arrows.forEach(arrow => arrow.classList.add('animated-arrow'));
    }, 10);
}