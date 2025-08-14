// Simulación de controladores P, PI, PID para sistema RLC subamortiguado
clear;  // Solo usamos clear para limpiar variables

// Caso 2
R = 0.5;
L = 0.05;
C = 0.05;

// Función de transferencia del sistema RLC
s = poly(0,'s');
num = 1/(L*C);
den = s^2 + (R/L)*s + (1/(L*C));
G = syslin('c', num, den);

// Parámetros de simulación
t = 0:0.01:10;  // Vector de tiempo
ref = 1;        // Valor de referencia (escalón unitario)

// Diseño de controladores
// Controlador P
Kp = 10;  // Ganancia proporcional
Gc_P = Kp;
sys_P = Gc_P * G /. 1;

// Controlador PI
Kp_PI = 15;
Ki = 5;
Gc_PI = Kp_PI * (1 + Ki/s);
sys_PI = Gc_PI * G /. 1;

// Controlador PID
Kp_PID = 20;
Ki_PID = 10;
Kd = 2;
Gc_PID = Kp_PID * (1 + Ki_PID/s + Kd*s);
sys_PID = Gc_PID * G /. 1;

// Simulación de las respuestas
y_P = csim('step', t, sys_P);
y_PI = csim('step', t, sys_PI);
y_PID = csim('step', t, sys_PID);

// Gráficas
scf(0); clf();
plot(t, ref*ones(t), 'k--', 'LineWidth', 2);  // Referencia
plot(t, y_P, 'b', 'LineWidth', 2);
plot(t, y_PI, 'g', 'LineWidth', 2);
plot(t, y_PID, 'r', 'LineWidth', 2);
xlabel('Tiempo (s)');
ylabel('Salida');
title('Comparación de Controladores P, PI, PID - Sistema RLC Subamortiguado');
legend(['Referencia'; 'Controlador P'; 'Controlador PI'; 'Controlador PID'], 4);
xgrid;

// Respuesta del sistema sin controlador (para comparación)
y_open = csim('step', t, G);
scf(1); clf();
plot(t, ref*ones(t), 'k--', 'LineWidth', 2);  // Referencia
plot(t, y_open, 'm', 'LineWidth', 2);
xlabel('Tiempo (s)');
ylabel('Salida');
title('Respuesta del Sistema RLC sin Controlador');
legend(['Referencia'; 'Sistema sin control'], 4);
xgrid;
