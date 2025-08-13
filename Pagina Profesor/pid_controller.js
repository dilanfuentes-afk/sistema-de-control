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

/**
 * Initializes the entire application after the DOM is fully loaded.
 * It sets up the diagram, event listeners, and runs an initial simulation.
 */
document.addEventListener('DOMContentLoaded', () => {
    createPIDDiagram();
    setupEventListeners();
    updatePlantDisplay();
    runSimulation();
});

/**
 * Creates the interactive PID control loop diagram using SVG.
 * Each key component (arrows, blocks) is given a unique ID for interactivity.
 */
function createPIDDiagram() {
    const diagramContainer = document.getElementById('pidDiagram');
    if (!diagramContainer) return;

    // SVG markup for the control system diagram
    const diagramSVG = `
        <svg viewBox="0 0 800 250" preserveAspectRatio="xMidYMid meet" class="w-full h-full">
            <!-- Main lines and arrows -->
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-color)"></path>
                </marker>
            </defs>

            <!-- Reference Signal -->
            <g class="signal-arrow" data-signal="reference">
                <line x1="20" y1="100" x2="100" y2="100" stroke="var(--text-color)" stroke-width="2" marker-end="url(#arrow)" />
                <text x="40" y="90" fill="var(--text-color)" font-size="14">R(s)</text>
            </g>

            <!-- Summation Point -->
            <circle cx="125" cy="100" r="25" fill="none" stroke="var(--accent-color)" stroke-width="2" />
            <text x="120" y="95" fill="var(--text-color)" font-size="20">+</text>
            <text x="120" y="125" fill="var(--text-color)" font-size="20">-</text>

            <!-- Error Signal -->
            <g class="signal-arrow" data-signal="error">
                <line x1="150" y1="100" x2="220" y2="100" stroke="var(--text-color)" stroke-width="2" marker-end="url(#arrow)" />
                <text x="170" y="90" fill="var(--text-color)" font-size="14">E(s)</text>
            </g>

            <!-- PID Controller Block -->
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

            <!-- Control Signal (Manipulated Variable) -->
            <g class="signal-arrow" data-signal="control">
                <line x1="380" y1="100" x2="450" y2="100" stroke="var(--text-color)" stroke-width="2" marker-end="url(#arrow)" />
                <text x="400" y="90" fill="var(--text-color)" font-size="14">U(s)</text>
            </g>

            <!-- Plant Block -->
            <g id="plant-block-container">
                 <rect x="450" y="60" width="160" height="80" fill="var(--card-bg)" stroke="var(--secondary-color)" stroke-width="2" rx="5" />
                 <foreignObject x="455" y="65" width="150" height="70">
                    <div id="plant-display" class="w-full h-full flex flex-col items-center justify-center text-center text-white p-1"></div>
                 </foreignObject>
            </g>

            <!-- Output Signal -->
            <g class="signal-arrow" data-signal="output">
                <line x1="610" y1="100" x2="700" y2="100" stroke="var(--text-color)" stroke-width="2" marker-end="url(#arrow)" />
                <text x="630" y="90" fill="var(--text-color)" font-size="14">Y(s)</text>
            </g>
            
            <!-- Feedback Loop -->
            <path d="M 650 100 L 650 175 L 125 175 L 125 125" stroke="var(--text-color)" stroke-width="2" fill="none" marker-end="url(#arrow)" />
        </svg>
    `;
    diagramContainer.innerHTML = diagramSVG;
}

/**
 * Sets up all necessary event listeners for the UI components.
 */
function setupEventListeners() {
    // Main simulation button
    document.getElementById('runButton').addEventListener('click', runSimulation);

    // Link sliders to input fields and update values in real-time
    ['kp', 'ki', 'kd'].forEach(param => {
        const slider = document.getElementById(`${param}Slider`);
        const valueSpan = document.getElementById(`${param}Value`);
        const input = document.getElementById(param);

        slider.addEventListener('input', () => {
            const val = slider.value;
            valueSpan.textContent = val;
            input.value = val;
            runSimulation(); // Re-run simulation on slider change for immediate feedback
        });

        input.addEventListener('change', () => {
            slider.value = input.value;
            valueSpan.textContent = input.value;
            runSimulation();
        });
    });
    
    // NEW: Add listeners for the slider range inputs
    setupSliderRangeListeners();

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

    // Ziegler-Nichols tuning tool listeners
    document.getElementById('startZnButton').addEventListener('click', startZieglerNicholsTuning);
    document.getElementById('znKpSlider').addEventListener('input', handleZnKpChange);

    // Setup interactivity for the diagram arrows
    setupDiagramInteractivity();
}

/**
 * NEW: Sets up event listeners for the slider range input fields.
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

            // Validate that the range is logical before applying
            if (!isNaN(min) && !isNaN(max) && min <= max) {
                slider.min = min;
                slider.max = max;
                
                // If the slider's current value is outside the new range, adjust it.
                const currentValue = parseFloat(slider.value);
                if (currentValue < min) {
                    slider.value = min;
                    slider.dispatchEvent(new Event('input')); // Trigger update of value and simulation
                }
                if (currentValue > max) {
                    slider.value = max;
                    slider.dispatchEvent(new Event('input')); // Trigger update of value and simulation
                }
            } else {
                console.warn(`Invalid range for ${param}: min=${min}, max=${max}. Not applying.`);
            }
        };

        // Listen for the 'change' event, which fires after the user finishes editing
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
    signalPreviewChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: simulationData.time,
            datasets: [{
                label: `${signalName.charAt(0).toUpperCase() + signalName.slice(1)} Signal`,
                data: simulationData[signalName],
                borderColor: 'var(--accent-color)',
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
                y: { ticks: { color: 'white', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.2)' } }
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

    // Parse transfer function coefficients
    const numerator = numStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const denominator = denStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

    if (denominator.length === 0 || numerator.length === 0) {
        console.error("Invalid transfer function coefficients.");
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
        const y = C.reduce((sum, val, j) => sum + val * x[j], 0) + D * (control[i-1] || 0);
        output[i] = y;

        // Calculate error
        const currentError = reference[i] - y;
        error[i] = currentError;

        // PID controller logic
        integral += currentError * dt;
        const derivative = (i > 0) ? (currentError - prevError) / dt : 0;
        const u = kp * currentError + ki * integral + kd * derivative;
        control[i] = u;
        
        prevError = currentError;

        // Update state vector using Runge-Kutta 4th order method
        x = rungeKutta(A, B, x, u, dt);
    }

    // Store all data for other functions to use
    simulationData = { time, reference, output, error, control };

    // Update UI
    plotResults(simulationData);
    displayMetrics(simulationData);
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
        case 'ramp': return amp * Math.min(1, t);
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
    den = den.map(d => d / den_norm);
    num = num.map(n => n / den_norm);
    
    den.shift(); // Remove the highest order coefficient (which is now 1)
    const n = den.length;

    // Pad numerator to match denominator order
    let num_padded = [...Array(n - num.length + 1).fill(0), ...num];

    const A = Array(n).fill(0).map(() => Array(n).fill(0));
    for(let i = 0; i < n-1; i++) A[i][i+1] = 1;
    for(let i = 0; i < n; i++) A[n-1][i] = -den[n-1-i];

    const B = Array(n).fill(0);
    B[n-1] = 1;

    const C = Array(n).fill(0);
    const d_c = num_padded[0];
    for(let i = 0; i < n; i++) C[i] = num_padded[i+1] - d_c * (A[n-1][i] / -den[n-1-i] * den[i]);
    
    const D = d_c;

    // A simple approximation for C if the above fails
    for(let i=0; i<n; i++) {
        C[i] = num_padded[num_padded.length - 1 - i] - num_padded[0] * den[n-1-i];
    }


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
 * @param {object} data - The simulation data object.
 */
function plotResults(data) {
    const { time, reference, output, control } = data;
    const ctx = document.getElementById('responseChart').getContext('2d');

    if (responseChart) {
        responseChart.destroy();
    }

    responseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: time,
            datasets: [
                {
                    label: 'Reference Signal',
                    data: reference,
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y'
                },
                {
                    label: 'System Output',
                    data: output,
                    borderColor: 'var(--accent-color)',
                    backgroundColor: 'rgba(187, 134, 252, 0.1)',
                    fill: true,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    yAxisID: 'y'
                },
                {
                    label: 'Control Signal',
                    data: control,
                    borderColor: 'var(--secondary-color)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    hidden: true, // Initially hidden
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { title: { display: true, text: 'Time (s)', color: '#aaa' }, ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { position: 'left', title: { display: true, text: 'System Response', color: '#aaa' }, ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y1: { position: 'right', title: { display: true, text: 'Control Signal', color: '#aaa' }, ticks: { color: '#aaa' }, grid: { drawOnChartArea: false } }
            },
            plugins: {
                legend: { labels: { color: '#e0e0e0' } },
                tooltip: { backgroundColor: 'rgba(30,30,30,0.9)', titleColor: '#bb86fc', bodyColor: '#e0e0e0' }
            }
        }
    });
}

/**
 * Calculates and displays key performance metrics from the simulation data.
 * @param {object} data - The simulation data object.
 */
function displayMetrics(data) {
    const { time, reference, output } = data;
    const finalRef = reference[reference.length - 1];
    const steadyStateValue = output[output.length - 1];
    const steadyStateError = finalRef - steadyStateValue;

    // Overshoot
    let overshoot = 0;
    if (document.getElementById('controlType').value === 'step') {
        const maxValue = Math.max(...output);
        overshoot = finalRef > 0 ? ((maxValue - finalRef) / finalRef) * 100 : 0;
    }

    // Rise Time (10% to 90%)
    let t10 = -1, t90 = -1;
    for (let i = 0; i < output.length; i++) {
        if (t10 < 0 && output[i] >= 0.1 * finalRef) t10 = time[i];
        if (t90 < 0 && output[i] >= 0.9 * finalRef) {
            t90 = time[i];
            break;
        }
    }
    const riseTime = (t10 >= 0 && t90 >= 0) ? t90 - t10 : 0;

    // Settling Time (within 2% of final value)
    let settlingTime = 0;
    for (let i = output.length - 1; i >= 0; i--) {
        if (Math.abs(output[i] - steadyStateValue) > 0.02 * Math.abs(finalRef)) {
            settlingTime = time[i];
            break;
        }
    }

    // Update UI
    document.getElementById('steadyStateError').textContent = steadyStateError.toFixed(3);
    document.getElementById('overshoot').textContent = `${overshoot.toFixed(2)}%`;
    document.getElementById('riseTime').textContent = `${riseTime.toFixed(3)}s`;
    document.getElementById('settlingTime').textContent = `${settlingTime.toFixed(3)}s`;
}

/**
 * Updates the plant block in the diagram to display a nicely formatted transfer function.
 */
function updatePlantDisplay() {
    const numStr = document.getElementById('numerator').value;
    const denStr = document.getElementById('denominator').value;
    const num = numStr.split(',').map(s => parseFloat(s.trim()));
    const den = denStr.split(',').map(s => parseFloat(s.trim()));

    const formatPoly = (poly) => {
        if (!poly || poly.some(isNaN)) return 'Invalid';
        return poly.map((c, i) => {
            if (c === 0) return '';
            const power = poly.length - 1 - i;
            const sign = c > 0 ? ' + ' : ' - ';
            const coeff = Math.abs(c) === 1 && power > 0 ? '' : Math.abs(c).toFixed(2);
            const sTerm = power > 1 ? `s<sup>${power}</sup>` : (power === 1 ? 's' : '');
            return `${sign}${coeff}${sTerm}`;
        }).join('').replace(/^\s\+\s/, '').trim();
    };

    const plantDisplay = document.getElementById('plant-display');
    plantDisplay.innerHTML = `
        <div class="text-xs leading-tight">${formatPoly(num) || '0'}</div>
        <hr class="w-2/3 my-1 border-white">
        <div class="text-xs leading-tight">${formatPoly(den) || '1'}</div>
    `;
}


// --- Ziegler-Nichols Tuning Section ---

/**
 * Initiates the Ziegler-Nichols tuning process.
 * Sets Ki and Kd to 0 and prepares the UI for finding Ku.
 */
function startZieglerNicholsTuning() {
    // Advise user
    alert("Ziegler-Nichols Method: Set Ki and Kd to 0. Slowly increase Kp from 0 until the output shows sustained, stable oscillations. The Kp value at that point is Ku. The period of oscillation is Tu.");

    // Set controller for tuning
    document.getElementById('kiSlider').value = 0;
    document.getElementById('ki').value = 0;
    document.getElementById('kiValue').textContent = 0;
    document.getElementById('kdSlider').value = 0;
    document.getElementById('kd').value = 0;
    document.getElementById('kdValue').textContent = 0;
    
    // Set reference to a step input
    document.getElementById('controlType').value = 'step';
    handleControlTypeChange();

    // Reset and focus on the Kp slider for tuning
    document.getElementById('kpSlider').value = 0;
    document.getElementById('kp').value = 0;
    document.getElementById('kpValue').textContent = 0;
    document.getElementById('znKpSlider').value = 0;
    document.getElementById('znKpValue').textContent = 0;
    
    runSimulation();
}

/**
 * Handles changes on the dedicated Kp slider for Z-N tuning.
 */
function handleZnKpChange() {
    const znKp = document.getElementById('znKpSlider').value;
    document.getElementById('znKpValue').textContent = znKp;

    // Update the main Kp controller and re-run simulation
    document.getElementById('kpSlider').value = znKp;
    document.getElementById('kp').value = znKp;
    document.getElementById('kpValue').textContent = znKp;
    runSimulation();
    
    // Analyze for oscillations
    findTu(simulationData.output, simulationData.time);
}

/**
 * Analyzes the output signal to find the period of oscillation (Tu).
 * @param {number[]} output - The system output data.
 * @param {number[]} time - The time data.
 */
function findTu(output, time) {
    const dt = time[1] - time[0];
    const peaks = [];
    // Find peaks in the latter half of the simulation
    for (let i = Math.floor(output.length / 2); i < output.length - 1; i++) {
        if (output[i] > output[i-1] && output[i] > output[i+1] && output[i] > 1) { // Find peaks above steady state
            peaks.push(time[i]);
        }
    }

    let tu = 0;
    if (peaks.length >= 2) {
        // Average the period between consecutive peaks
        let totalPeriod = 0;
        for(let i=0; i<peaks.length-1; i++){
            totalPeriod += peaks[i+1] - peaks[i];
        }
        tu = totalPeriod / (peaks.length - 1);
    }
    
    document.getElementById('kuValue').textContent = document.getElementById('znKpSlider').value;
    document.getElementById('tuValue').textContent = tu > 0 ? tu.toFixed(3) : 'N/A';
    
    // If Tu is found, suggest PID parameters
    if (tu > 0) {
        const Ku = parseFloat(document.getElementById('znKpSlider').value);
        const Tu = tu;
        suggestZNPIDValues(Ku, Tu);
    } else {
        document.getElementById('zn-suggestions').innerHTML = '';
    }
}

/**
 * Suggests PID parameters based on Ku and Tu using classic Z-N rules.
 * @param {number} Ku - Ultimate Gain.
 * @param {number} Tu - Ultimate Period.
 */
function suggestZNPIDValues(Ku, Tu) {
    const suggestions = {
        P: { Kp: 0.5 * Ku, Ki: 0, Kd: 0 },
        PI: { Kp: 0.45 * Ku, Ki: (0.45 * Ku) / (Tu / 1.2), Kd: 0 },
        PID: { Kp: 0.6 * Ku, Ki: (0.6 * Ku) / (Tu / 2), Kd: (0.6 * Ku) * (Tu / 8) }
    };

    const suggestionHTML = `
        <h4 class="font-bold mt-2 text-purple-300">Suggested Values:</h4>
        <ul class="list-disc list-inside text-sm space-y-1 mt-1">
            <li><b>P:</b> Kp=${suggestions.P.Kp.toFixed(2)}</li>
            <li><b>PI:</b> Kp=${suggestions.PI.Kp.toFixed(2)}, Ki=${suggestions.PI.Ki.toFixed(2)}</li>
            <li><b>PID:</b> Kp=${suggestions.PID.Kp.toFixed(2)}, Ki=${suggestions.PID.Ki.toFixed(2)}, Kd=${suggestions.PID.Kd.toFixed(2)}</li>
        </ul>
    `;
    document.getElementById('zn-suggestions').innerHTML = suggestionHTML;
}
