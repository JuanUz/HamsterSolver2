document.addEventListener('DOMContentLoaded', () => {
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
                rowHtml += `<input type="number" id="a_${i}_${j}" class="input-small" value="0"> <span>x${j+1}</span>`;
                if(j < n - 1) rowHtml += ' <span>+</span> ';
            }
            rowHtml += ` <span>=</span> <input type="number" id="b_${i}" class="input-small" value="0"></div>`;
            matrixContainer.innerHTML += rowHtml;
        }

        modelSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    });

    // Función para intentar hacer la matriz diagonalmente dominante
    function pivotarMatriz(A, b) {
        let size = A.length;
        for (let i = 0; i < size; i++) {
            let maxRow = i;
            let maxVal = Math.abs(A[i][i]);
            for (let k = i + 1; k < size; k++) {
                if (Math.abs(A[k][i]) > maxVal) {
                    maxVal = Math.abs(A[k][i]);
                    maxRow = k;
                }
            }
            // Intercambiar filas si encontramos un pivote mejor
            if (maxRow !== i) {
                let tempA = A[i];
                A[i] = A[maxRow];
                A[maxRow] = tempA;
                
                let tempB = b[i];
                b[i] = b[maxRow];
                b[maxRow] = tempB;
            }
        }
    }

    btnSolve.addEventListener('click', () => {
        let tol = parseFloat(document.getElementById('error-tol').value);
        let A = [];
        let b = [];

        // Extraer valores
        for(let i = 0; i < n; i++) {
            let row = [];
            for(let j = 0; j < n; j++) {
                row.push(parseFloat(document.getElementById(`a_${i}_${j}`).value));
            }
            A.push(row);
            b.push(parseFloat(document.getElementById(`b_${i}`).value));
        }

        // Pivoteo para mejorar convergencia
        pivotarMatriz(A, b);

        let x = new Array(n).fill(0); // Vector inicial en 0
        let maxIter = 100;
        let iter = 0;
        let error = Infinity;
        
        let iterHtml = `<h3>Iteraciones Paso a Paso</h3>`;
        iterHtml += `<div class="iteration-card"><table class="simplex-table"><thead><tr><th>Iter</th>`;
        for(let i=0; i<n; i++) iterHtml += `<th>x${i+1}</th>`;
        iterHtml += `<th>Error</th></tr></thead><tbody>`;

        iterHtml += `<tr><td>0</td>`;
        for(let i=0; i<n; i++) iterHtml += `<td>0.0000</td>`;
        iterHtml += `<td>-</td></tr>`;

        let diverged = false;

        // Algoritmo Gauss-Seidel
        while(error > tol && iter < maxIter) {
            let x_old = [...x];
            error = 0;

            for(let i = 0; i < n; i++) {
                let sum = 0;
                for(let j = 0; j < n; j++) {
                    if (j !== i) {
                        sum += A[i][j] * x[j];
                    }
                }
                
                if (A[i][i] === 0) {
                    alert("Cero en la diagonal principal detectado incluso tras pivotar. El método no puede continuar.");
                    return;
                }

                x[i] = (b[i] - sum) / A[i][i];
                
                // Calcular error máximo absoluto
                let currentError = Math.abs(x[i] - x_old[i]);
                if (currentError > error) error = currentError;
            }

            iter++;
            
            // Protección contra divergencia (explosión de valores)
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
            iterHtml += `<p style="color: red;"><strong>Advertencia:</strong> El sistema no convergió después de ${iter} iteraciones. La matriz probablemente no es diagonalmente dominante.</p>`;
        }

        document.getElementById('iterations-container').innerHTML = iterHtml;

        let solutionHtml = `<div class="result-box"><p><strong>Solución Final Aproximada:</strong></p><ul>`;
        let variableResults = "";
        for(let i = 0; i < n; i++) {
            solutionHtml += `<li>x${i+1} = ${x[i].toFixed(4)}</li>`;
            variableResults += `x${i+1} = ${x[i].toFixed(4)}, `;
        }
        solutionHtml += `</ul></div>`;
        document.getElementById('solution-output').innerHTML = solutionHtml;
        resultsSection.classList.remove('hidden');

        // Contexto para la IA
        const systemPrompt = `Eres "HamsterSolver", un tutor experto en Métodos Numéricos. 
        El usuario acaba de intentar resolver un sistema de ecuaciones de ${n}x${n} por el método de Gauss-Seidel.
        Resultados obtenidos: ${variableResults} en ${iter} iteraciones, con un error final de ${error.toFixed(5)}.
        
        REGLA DE ORO: Responde dudas sobre Gauss-Seidel, convergencia, dominancia diagonal o este sistema en particular de forma concisa.`;

        chatMessages = [{ role: "system", content: systemPrompt }];
        chatHistory.innerHTML = '<div class="chat-msg msg-bot">¡Resultados de Gauss-Seidel listos! ¿Tienes dudas sobre cómo se calculó el error o por qué convergió (o no) el sistema? 🐹</div>';
    });

    // Lógica del Chat (Modificada la ruta para Vercel)
    async function sendMessage() {
        const text = chatInput.value.trim();
        if(!text) return;

        chatHistory.innerHTML += `<div class="chat-msg msg-user">${text}</div>`;
        chatInput.value = '';
        chatHistory.scrollTop = chatHistory.scrollHeight;
        chatMessages.push({ role: "user", content: text });

        const loadingId = "loading-" + Date.now();
        chatHistory.innerHTML += `<div id="${loadingId}" class="chat-msg msg-bot">Pensando la matriz... 🐹💭</div>`;
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            // Vercel rutea esto automáticamente a la carpeta /api
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