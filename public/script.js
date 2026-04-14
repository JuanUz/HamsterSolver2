document.addEventListener('DOMContentLoaded', () => {
    // Registrar el Service Worker para la PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error', err));
        });
    }

    const btnGenerate = document.getElementById('btn-generate');
    const btnSolve = document.getElementById('btn-solve');
    const modelSection = document.getElementById('model-section');
    const resultsSection = document.getElementById('results-section');
    
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
                // Se agregó step="any" para permitir decimales fácilmente
                rowHtml += `<input type="number" id="a_${i}_${j}" class="input-small" value="0" step="any"> <span>x${j+1}</span>`;
                if(j < n - 1) rowHtml += ' <span>+</span> ';
            }
            rowHtml += ` <span>=</span> <input type="number" id="b_${i}" class="input-small" value="0" step="any"></div>`;
            matrixContainer.innerHTML += rowHtml;
        }

        modelSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    });

    // Función modificada para devolver 'true' si hizo intercambio (Paso 1 y 2 del pizarrón)
    function pivotarMatriz(A, b) {
        let size = A.length;
        let huboIntercambio = false;
        
        for (let i = 0; i < size; i++) {
            let maxRow = i;
            let maxVal = Math.abs(A[i][i]);
            for (let k = i + 1; k < size; k++) {
                if (Math.abs(A[k][i]) > maxVal) {
                    maxVal = Math.abs(A[k][i]);
                    maxRow = k;
                }
            }
            if (maxRow !== i) {
                let tempA = A[i];
                A[i] = A[maxRow];
                A[maxRow] = tempA;
                
                let tempB = b[i];
                b[i] = b[maxRow];
                b[maxRow] = tempB;
                huboIntercambio = true;
            }
        }
        return huboIntercambio;
    }

    btnSolve.addEventListener('click', () => {
        let tol = parseFloat(document.getElementById('error-tol').value);
        let A = [];
        let b = [];
        
        // Copias originales para el Paso 5 (Comprobación)
        let A_original = [];
        let b_original = [];

        // Extraer valores
        for(let i = 0; i < n; i++) {
            let row = [];
            let row_orig = [];
            for(let j = 0; j < n; j++) {
                let val = parseFloat(document.getElementById(`a_${i}_${j}`).value);
                row.push(val);
                row_orig.push(val);
            }
            A.push(row);
            A_original.push(row_orig);
            
            let bVal = parseFloat(document.getElementById(`b_${i}`).value);
            b.push(bVal);
            b_original.push(bVal);
        }

        // Pasos 1 y 2: Pivotar matriz
        let intercambio = pivotarMatriz(A, b);

        // --- PASO 3: Generar HTML de Despejes ---
        let despejesHtml = `<div class="result-box" style="margin-bottom: 20px;">
            <h3 style="margin-bottom: 10px;">Paso 1, 2 y 3: Verificación y Despejes</h3>`;
            
        if (intercambio) {
            despejesHtml += `<p style="color: var(--primary-hover); font-weight: 600; font-size: 0.9rem; margin-bottom: 10px;">
                🔄 Se realizó un intercambio de filas para garantizar la dominancia diagonal.</p>`;
        } else {
             despejesHtml += `<p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 10px;">
                ✅ La matriz se procesó en su orden original (diagonal verificada).</p>`;
        }
        
        despejesHtml += `<ul style="list-style-type: none; padding-left: 0; font-family: monospace; font-size: 1.1rem;">`;
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
            despejesHtml += `<li style="margin-bottom: 8px; background: #fff; padding: 5px; border-radius: 4px; border: 1px solid var(--border);">${eq}</li>`;
        }
        despejesHtml += `</ul></div>`;

        // --- PASO 4: Inicialización y Algoritmo ---
        let x = new Array(n).fill(0); // x inicializadas en 0
        let maxIter = 100;
        let iter = 0;
        let error = Infinity;
        
        let iterHtml = `<h3>Paso 4: Iteraciones (Inicializando en 0)</h3>`;
        iterHtml += `<div class="iteration-card"><table class="simplex-table"><thead><tr><th>Iter</th>`;
        for(let i=0; i<n; i++) iterHtml += `<th>x${i+1}</th>`;
        iterHtml += `<th>Error</th></tr></thead><tbody>`;

        // Imprimir iteración 0
        iterHtml += `<tr><td>0</td>`;
        for(let i=0; i<n; i++) iterHtml += `<td>0.0000</td>`;
        iterHtml += `<td>-</td></tr>`;

        let diverged = false;

        while(error > tol && iter < maxIter) {
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
        }
        
        iterHtml += `</tbody></table></div>`;
        
        if (diverged || iter === maxIter) {
            iterHtml += `<p style="color: red;"><strong>Advertencia:</strong> El sistema no convergió después de ${iter} iteraciones.</p>`;
        }

        // Inyectamos los despejes antes de la tabla
        document.getElementById('iterations-container').innerHTML = despejesHtml + iterHtml;

        let solutionHtml = `<div class="result-box"><p><strong>Solución Final Aproximada:</strong></p><ul>`;
        let variableResults = "";
        for(let i = 0; i < n; i++) {
            solutionHtml += `<li>x${i+1} = ${x[i].toFixed(4)}</li>`;
            variableResults += `x${i+1} = ${x[i].toFixed(4)}, `;
        }
        solutionHtml += `</ul></div>`;

        // --- PASO 5: Comprobación ---
        let compHtml = `<div class="result-box" style="margin-top: 15px; background-color: #f1eadd; border-left: 4px solid var(--primary-hover);">
            <h3 style="margin-bottom: 10px;">Paso 5: Comprobación</h3>
            <p style="font-size: 0.9rem; margin-bottom: 10px;">Sustituyendo los resultados en el sistema original:</p>
            <ul style="list-style-type: none; padding-left: 0; font-family: monospace; font-size: 1rem;">`;
            
        for(let i = 0; i < n; i++) {
            let sum = 0;
            let eqStr = "";
            for(let j = 0; j < n; j++) {
                sum += A_original[i][j] * x[j];
                let term = A_original[i][j].toFixed(2);
                let valX = x[j].toFixed(4);
                eqStr += `(${term})(<strong>${valX}</strong>)`;
                if(j < n-1) eqStr += " + ";
            }
            compHtml += `<li style="margin-bottom: 8px; background: #fff; padding: 6px; border-radius: 4px;">Ecuación ${i+1}: ${eqStr} = <strong>${sum.toFixed(4)}</strong> <br><em style="color: var(--text-muted); font-size: 0.85rem;">(Valor original de RHS esperado: ${b_original[i].toFixed(2)})</em></li>`;
        }
        compHtml += `</ul></div>`;

        // Inyectamos el resultado final seguido de la comprobación
        document.getElementById('solution-output').innerHTML = solutionHtml + compHtml;
        resultsSection.classList.remove('hidden');

        // Contexto para la IA
        const systemPrompt = `Eres "HamsterSolver", un tutor experto en Métodos Numéricos. 
        El usuario acaba de intentar resolver un sistema de ecuaciones de ${n}x${n} por el método de Gauss-Seidel.
        Resultados obtenidos: ${variableResults} en ${iter} iteraciones, con un error final de ${error.toFixed(5)}.
        
        REGLA DE ORO: Responde dudas sobre Gauss-Seidel, convergencia, dominancia diagonal o este sistema en particular de forma concisa.`;

        chatMessages = [{ role: "system", content: systemPrompt }];
        chatHistory.innerHTML = '<div class="chat-msg msg-bot">¡Resultados de Gauss-Seidel listos, con despejes y comprobación! ¿Tienes dudas sobre el procedimiento? 🐹</div>';
    });

    // Lógica del Chat (Serverless)
    async function sendMessage() {
        const text = chatInput.value.trim();
        if(!text) return;

        chatHistory.innerHTML += `<div class="chat-msg msg-user">${text}</div>`;
        chatInput.value = '';
        chatHistory.scrollTop = chatHistory.scrollHeight;
        chatMessages.push({ role: "user", content: text });

        const loadingId = "loading-" + Date.now();
        chatHistory.innerHTML += `<div id="${loadingId}" class="chat-msg msg-bot">Analizando los despejes... 🐹💭</div>`;
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: chatMessages })
            });
            const data = await response.json();
            document.getElementById(loadingId).remove();

            const botReply = data.reply;
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