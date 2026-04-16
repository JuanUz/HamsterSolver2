document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error', err));
        });
    }

    const btnGenerate = document.getElementById('btn-generate');
    const btnSolve = document.getElementById('btn-solve');
    const modelSection = document.getElementById('model-section');
    const resultsSection = document.getElementById('results-section');
    
    // --- NUEVA LÓGICA DE INTERFAZ (Selector de Criterio) ---
    const stopCriterionSelect = document.getElementById('stop-criterion');
    const divErrorTol = document.getElementById('div-error-tol');
    const divMaxIter = document.getElementById('div-max-iter');

    stopCriterionSelect.addEventListener('change', (e) => {
        if (e.target.value === 'error') {
            divErrorTol.style.display = 'block';
            divMaxIter.style.display = 'none';
        } else {
            divErrorTol.style.display = 'none';
            divMaxIter.style.display = 'block';
        }
    });

    const btnSendChat = document.getElementById('btn-send-chat');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    let chatMessages = [];
    
    let n = 0;

    btnGenerate.addEventListener('click', () => {
        n = parseInt(document.getElementById('matrix-size').value);
        if(n < 2 || n > 10) {
            alert("Por favor ingresa un tamaño válido (entre 2 y 10).");
            return;
        }

        const matrixContainer = document.getElementById('matrix-container');
        matrixContainer.innerHTML = '';

        for(let i = 0; i < n; i++) {
            let rowHtml = `<div class="matrix-row">`;
            for(let j = 0; j < n; j++) {
                rowHtml += `<input type="number" id="a_${i}_${j}" class="input-small" value="0" step="any"> <span>x${j+1}</span>`;
                if(j < n - 1) rowHtml += ' <span>+</span> ';
            }
            rowHtml += ` <span>=</span> <input type="number" id="b_${i}" class="input-small" value="0" step="any"></div>`;
            matrixContainer.innerHTML += rowHtml;
        }

        modelSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    });

    function pivotarYVerificar(A, b) {
        let size = A.length;
        let logHTML = `<ul style="list-style-type: none; padding-left: 0; font-family: monospace; font-size: 0.95rem;">`;
        let intercambios = 0;

        for (let i = 0; i < size; i++) {
            let sumaResto = 0;
            let equationStr = "";
            for (let j = 0; j < size; j++) {
                if (i !== j) {
                    sumaResto += Math.abs(A[i][j]);
                    equationStr += `|${A[i][j].toFixed(2)}|${j < size-1 && (size-1 !== i || j < size-2) ? ' + ' : ''}`;
                }
            }
            equationStr = equationStr.replace(/\s\+\s$/, ''); 
            
            let diagonalVal = Math.abs(A[i][i]);
            let esDominante = diagonalVal >= sumaResto;

            if (esDominante) {
                logHTML += `<li style="margin-bottom: 8px; background: #0a0b0d; padding: 10px; border-radius: 6px; border: 1px solid #2a432a; border-left: 4px solid #4ceabf;">
                <span style="color: var(--text-main);">Fila ${i+1}:</span> Verifica $|a_{${i+1},${i+1}}| \\ge \\sum |a_{${i+1},j}|$. <br>
                <span style="color: #4ceabf;">${diagonalVal.toFixed(2)} $\\ge$ ${equationStr} (${sumaResto.toFixed(2)})</span> ✅ Dominante.</li>`;
            } else {
                let maxRow = i;
                let maxVal = diagonalVal;
                for (let k = i + 1; k < size; k++) {
                    if (Math.abs(A[k][i]) > maxVal) {
                        maxVal = Math.abs(A[k][i]);
                        maxRow = k;
                    }
                }

                if (maxRow !== i) {
                    let tempA = A[i]; A[i] = A[maxRow]; A[maxRow] = tempA;
                    let tempB = b[i]; b[i] = b[maxRow]; b[maxRow] = tempB;
                    intercambios++;
                    
                    logHTML += `<li style="margin-bottom: 8px; background: #0a0b0d; padding: 10px; border-radius: 6px; border: 1px solid #4a3820; border-left: 4px solid #ffa500;">
                    <span style="color: var(--text-main);">Fila ${i+1}:</span> <span style="color: #ff4d4d;">${diagonalVal.toFixed(2)} $<$ ${sumaResto.toFixed(2)}</span> ❌ No dominante. <br>
                    <span style="color: #ffa500;">🔄 Se buscó el valor máximo en la columna ${i+1} y se intercambió la Fila ${i+1} con la Fila ${maxRow+1}.</span></li>`;
                    i--;
                } else {
                     logHTML += `<li style="margin-bottom: 8px; background: #0a0b0d; padding: 10px; border-radius: 6px; border: 1px solid #4a2020; border-left: 4px solid #ff4d4d;">
                    <span style="color: var(--text-main);">Fila ${i+1}:</span> <span style="color: #ff4d4d;">${diagonalVal.toFixed(2)} $<$ ${sumaResto.toFixed(2)}</span> ❌ No dominante. <br>
                    <span style="color: var(--text-muted);">⚠️ No se encontró un valor mayor en la columna para pivotar. El método podría no convergir.</span></li>`;
                }
            }
        }
        logHTML += `</ul>`;
        return { huboIntercambio: intercambios > 0, logHTML };
    }

    btnSolve.addEventListener('click', () => {
        // Obtenemos qué criterio decidió el usuario
        let criterion = document.getElementById('stop-criterion').value;
        let tol = parseFloat(document.getElementById('error-tol').value);
        let maxIter = parseInt(document.getElementById('max-iter').value);
        
        let A = []; let b = [];
        let A_original = []; let b_original = [];

        for(let i = 0; i < n; i++) {
            let row = []; let row_orig = [];
            for(let j = 0; j < n; j++) {
                let val = parseFloat(document.getElementById(`a_${i}_${j}`).value);
                row.push(val); row_orig.push(val);
            }
            A.push(row); A_original.push(row_orig);
            let bVal = parseFloat(document.getElementById(`b_${i}`).value);
            b.push(bVal); b_original.push(bVal);
        }

        let pivotResult = pivotarYVerificar(A, b);
        
        let despejesHtml = `<div class="result-box" style="margin-bottom: 25px;">
            <h3 style="margin-bottom: 15px; color: var(--primary);">Paso 1 y 2: Verificación de Diagonal e Intercambios</h3>
            ${pivotResult.logHTML}
            <h3 style="margin-top: 20px; margin-bottom: 15px; color: var(--primary);">Paso 3: Ecuaciones Despejadas</h3>
            <ul style="list-style-type: none; padding-left: 0; font-family: monospace; font-size: 1.1rem;">`;
            
        for(let i = 0; i < n; i++) {
            let eq = `x<sub>${i+1}</sub> = ( ${b[i].toFixed(2)}`;
            for(let j = 0; j < n; j++) {
                if(i !== j) {
                    let sign = A[i][j] >= 0 ? '-' : '+';
                    let val = Math.abs(A[i][j]).toFixed(2);
                    eq += ` ${sign} ${val}x<sub>${j+1}</sub>`;
                }
            }
            eq += ` ) / ${A[i][i].toFixed(2)}`;
            despejesHtml += `<li style="margin-bottom: 8px; background: #0a0b0d; padding: 10px; border-radius: 6px; border: 1px solid #333; color: #f0f0f0;">${eq}</li>`;
        }
        despejesHtml += `</ul></div>`;

        let x = new Array(n).fill(0); 
        let iter = 0;
        let error = Infinity;
        
        let iterHtml = `<div class="iteration-card" style="margin-bottom: 25px;">
            <h3 style="margin-bottom: 15px; color: var(--primary);">Paso 4: Tabla de Iteraciones</h3>
            <table class="simplex-table"><thead><tr><th>Iter</th>`;
        for(let i=0; i<n; i++) iterHtml += `<th>x${i+1}</th>`;
        iterHtml += `<th>Error</th></tr></thead><tbody>`;

        iterHtml += `<tr><td>0</td>`;
        for(let i=0; i<n; i++) iterHtml += `<td>0.0000</td>`;
        iterHtml += `<td>-</td></tr>`;

        let diverged = false;
        let limitReached = false; // Variable auxiliar de seguridad

        // Bucle Principal Dinámico
        while(true) {
            let x_old = [...x];
            error = 0;

            for(let i = 0; i < n; i++) {
                let sum = 0;
                for(let j = 0; j < n; j++) {
                    if (j !== i) sum += A[i][j] * x[j];
                }
                
                if (A[i][i] === 0) {
                    alert("Cero en la diagonal principal detectado. El método no puede continuar.");
                    return;
                }

                x[i] = (b[i] - sum) / A[i][i];
                let currentError = Math.abs(x[i] - x_old[i]);
                if (currentError > error) error = currentError;
            }

            iter++;

            if(error > 1e6 || isNaN(error)) {
                diverged = true;
                break;
            }

            iterHtml += `<tr><td>${iter}</td>`;
            for(let i=0; i<n; i++) iterHtml += `<td>${x[i].toFixed(4)}</td>`;
            iterHtml += `<td>${error.toFixed(4)}</td></tr>`;

            // Verificamos si se debe detener basándonos en la elección del usuario
            if (criterion === 'error') {
                if (error <= tol) break;
                // Red de seguridad oculta para evitar que el navegador explote
                if (iter >= 500) { 
                    limitReached = true; 
                    break; 
                }
            } else if (criterion === 'iterations') {
                if (iter >= maxIter) break;
            }
        }
        iterHtml += `</tbody></table></div>`;
        
        // --- REPORTE EXPLÍCITO DEL CRITERIO DE PARADA ELEGIDO ---
        let stopCriterionHtml = `<div class="result-box" style="margin-bottom: 25px; border-left: 4px solid #ff007f;">
            <h3 style="margin-bottom: 15px; color: #ff007f;">Evaluación de Criterio de Parada (${criterion === 'error' ? 'Por Tolerancia' : 'Por Iteraciones'})</h3>
            <ul style="list-style-type: none; padding-left: 0; font-family: monospace; font-size: 1rem;">`;

        if (criterion === 'error') {
            stopCriterionHtml += `<li style="margin-bottom: 10px; background: #0a0b0d; padding: 12px; border-radius: 8px; border: 1px solid #333;">
                    <span style="color: var(--text-main);">Condición:</span> ¿Error Actual (${error.toFixed(5)}) $\\le$ Tolerancia (${tol})?<br>
                    <strong style="color: ${error <= tol ? '#4ceabf' : '#ff4d4d'};">-> ${error <= tol ? 'SÍ, SE CUMPLE ✅' : 'NO ❌'}</strong>
                </li>`;
            if (diverged) {
                stopCriterionHtml += `<p style="color: #ff4d4d; margin-top: 15px;"><strong>Conclusión:</strong> El sistema divirgió.</p>`;
            } else if (error <= tol) {
                stopCriterionHtml += `<p style="color: #4ceabf; margin-top: 15px; font-weight: 600;">Conclusión: El programa se detuvo exitosamente al alcanzar la tolerancia de error sugerida en la iteración ${iter}.</p>`;
            } else if (limitReached) {
                stopCriterionHtml += `<p style="color: #ffa500; margin-top: 15px; font-weight: 600;">Conclusión: El programa se detuvo automáticamente para evitar un ciclo infinito (límite de seguridad de 500 iteraciones) sin alcanzar la tolerancia requerida.</p>`;
            }
        } else {
            stopCriterionHtml += `<li style="margin-bottom: 10px; background: #0a0b0d; padding: 12px; border-radius: 8px; border: 1px solid #333;">
                    <span style="color: var(--text-main);">Condición:</span> ¿Iteración Actual (${iter}) $\\ge$ Límite (${maxIter})?<br>
                    <strong style="color: ${iter >= maxIter ? '#4ceabf' : '#ff4d4d'};">-> ${iter >= maxIter ? 'SÍ, SE CUMPLE ✅' : 'NO ❌'}</strong>
                </li>`;
            if (diverged) {
                stopCriterionHtml += `<p style="color: #ff4d4d; margin-top: 15px;"><strong>Conclusión:</strong> El sistema divirgió antes de llegar a la iteración máxima.</p>`;
            } else {
                stopCriterionHtml += `<p style="color: #4ceabf; margin-top: 15px; font-weight: 600;">Conclusión: El programa se detuvo exitosamente al realizar estrictamente las ${maxIter} iteraciones solicitadas. El error final obtenido fue de ${error.toFixed(5)}.</p>`;
            }
        }
        stopCriterionHtml += `</ul></div>`;

        document.getElementById('iterations-container').innerHTML = despejesHtml + iterHtml + stopCriterionHtml;

        let solutionHtml = `<div class="result-box"><p><strong>Solución Final Aproximada:</strong></p><ul>`;
        let variableResults = "";
        for(let i = 0; i < n; i++) {
            solutionHtml += `<li>x${i+1} = ${x[i].toFixed(4)}</li>`;
            variableResults += `x${i+1} = ${x[i].toFixed(4)}, `;
        }
        solutionHtml += `</ul></div>`;

        let compHtml = `<div class="result-box" style="margin-top: 25px;">
            <h3 style="margin-bottom: 15px; color: var(--primary);">Paso 5: Comprobación</h3>
            <p style="font-size: 0.95rem; margin-bottom: 15px; color: var(--text-muted);">Sustituyendo los resultados en el sistema original:</p>
            <ul style="list-style-type: none; padding-left: 0; font-family: monospace; font-size: 1rem;">`;
            
        for(let i = 0; i < n; i++) {
            let sum = 0; let eqStr = "";
            for(let j = 0; j < n; j++) {
                sum += A_original[i][j] * x[j];
                let term = A_original[i][j].toFixed(2);
                let valX = x[j].toFixed(4);
                eqStr += `(${term})(<strong style="color: var(--primary);">${valX}</strong>)`;
                if(j < n-1) eqStr += " + ";
            }
            compHtml += `<li style="margin-bottom: 10px; background: #0a0b0d; padding: 12px; border-radius: 8px; border: 1px solid #333;">
                <span style="color: var(--text-main);">Ecuación ${i+1}: ${eqStr} = </span><strong style="color: var(--primary); font-size: 1.1rem;">${sum.toFixed(4)}</strong> 
                <br><em style="color: var(--text-muted); font-size: 0.85rem; margin-top: 6px; display: block;">(Valor original de RHS esperado: ${b_original[i].toFixed(2)})</em>
            </li>`;
        }
        compHtml += `</ul></div>`;

        document.getElementById('solution-output').innerHTML = solutionHtml + compHtml;
        resultsSection.classList.remove('hidden');

        const systemPrompt = `Eres "HamsterSolver", un tutor experto en Métodos Numéricos. 
        El usuario acaba de intentar resolver un sistema de ecuaciones de ${n}x${n} por el método de Gauss-Seidel.
        Resultados obtenidos: ${variableResults} en ${iter} iteraciones, con un error final de ${error.toFixed(5)}.`;

        chatMessages = [{ role: "system", content: systemPrompt }];
        chatHistory.innerHTML = '<div class="chat-msg msg-bot">¡Resultados listos y analizados bajo tu criterio de parada! ¿Tienes alguna duda? 🐹</div>';
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if(!text) return;

        chatHistory.innerHTML += `<div class="chat-msg msg-user">${text}</div>`;
        chatInput.value = '';
        chatHistory.scrollTop = chatHistory.scrollHeight;
        chatMessages.push({ role: "user", content: text });

        const loadingId = "loading-" + Date.now();
        chatHistory.innerHTML += `<div id="${loadingId}" class="chat-msg msg-bot">Analizando... 🐹💭</div>`;
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: chatMessages })
            });
            const data = await response.json();
            document.getElementById(loadingId).remove();

            const botReply = data.reply || `Error del servidor: ${data.error}`;
            chatHistory.innerHTML += `<div class="chat-msg msg-bot">${botReply}</div>`;
            chatHistory.scrollTop = chatHistory.scrollHeight;
            chatMessages.push({ role: "assistant", content: botReply });
        } catch(err) {
            document.getElementById(loadingId).remove();
            chatHistory.innerHTML += `<div class="chat-msg msg-bot" style="color: red;">Error al conectar con la API Serverless.</div>`;
        }
    }

    btnSendChat.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendMessage();
    });
});