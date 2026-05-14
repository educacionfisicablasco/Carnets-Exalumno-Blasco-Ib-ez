// ⚠️ PEGA AQUÍ TU URL DE GOOGLE APPS SCRIPT ⚠️
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycby8nNAOwnq3RNT6F4lmO6LiclsAt40IE2LTrMMgOLFAm36ndCJSxAPKmf-PwBUlbGFBWQ/exec";

const form = document.getElementById('carnetForm');
const previewBtn = document.getElementById('previewBtn');
const canvas = document.getElementById('carnetCanvas');
const ctx = canvas.getContext('2d');
let numeroCarnetActual = null;

// Función para obtener el número de carnet en tiempo real desde Google Sheets
async function obtenerSiguienteNumero() {
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT);
        const data = await response.json();
        numeroCarnetActual = data.numero;
        console.log("Siguiente número de carnet obtenido:", numeroCarnetActual);
    } catch (error) {
        console.error("Error al obtener el número de carnet:", error);
        numeroCarnetActual = "??"; // Número de emergencia por si falla la conexión
    }
}

// Llamamos a la función nada más cargar la web para tener el número listo
obtenerSiguienteNumero();

// FUNCIÓN DE DIBUJO (Con tus coordenadas y campos integrados)
async function generarCarnet() {
    return new Promise((resolve, reject) => {
        const plantilla = new Image();
        plantilla.src = 'plantilla.jpg';

        plantilla.onload = function() {
            canvas.width = 1600;
            canvas.height = 1135;
            ctx.drawImage(plantilla, 0, 0, 1600, 1135);

            ctx.fillStyle = '#1a1a1a';
            ctx.font = 'bold 45px Arial';
            
            ctx.fillText(document.getElementById('nombre').value.toUpperCase(), 599, 427);
            ctx.fillText(document.getElementById('apellido').value.toUpperCase(), 599, 561);

            ctx.font = '35px Arial';
            ctx.fillText(document.getElementById('direccion').value, 609, 808);
            ctx.fillText(document.getElementById('email').value, 730, 887);

            // --- NUEVO: DIBUJAR NÚMERO DE CARNET AUTOMÁTICO ---
            ctx.fillStyle = '#1a1a1a'; 
            ctx.font = 'bold 45px Arial'; 
            ctx.fillText(`Nº ${numeroCarnetActual}`, 1073, 1019); // Tus coordenadas exactas

            const hoy = new Date();
            const dia = String(hoy.getDate()).padStart(2, '0');
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const anio = hoy.getFullYear();
            const fechaFormateada = `${dia}/${mes}/${anio}`;

            ctx.font = 'bold 22px Arial';
            ctx.fillText(fechaFormateada, 1073, 1085); 

            const fotoFile = document.getElementById('fotoInput').files[0];
            if (!fotoFile) {
                alert("Selecciona una foto.");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const fotoImg = new Image();
                fotoImg.onload = function() {
                    const mX = 48, mY = 335, mAncho = 477, mAlto = 650;
                    let fX, fY, fAncho, fAlto;
                    const propMarco = mAncho / mAlto;
                    const propFoto = fotoImg.width / fotoImg.height;

                    if (propFoto > propMarco) {
                        fAlto = fotoImg.height;
                        fAncho = fotoImg.height * propMarco;
                        fX = (fotoImg.width - fAncho) / 2; fY = 0;
                    } else {
                        fAncho = fotoImg.width;
                        fAlto = fotoImg.width / propMarco;
                        fX = 0; fY = (fotoImg.height - fAlto) / 2;
                    }

                    ctx.drawImage(fotoImg, fX, fY, fAncho, fAlto, mX, mY, mAncho, mAlto);
                    canvas.style.display = "inline-block";
                    resolve();
                };
                fotoImg.src = event.target.result;
            };
            reader.readAsDataURL(fotoFile);
        };
        plantilla.onerror = () => reject("No se pudo cargar la plantilla.jpg");
    });
}

// VISTA PREVIA
previewBtn.addEventListener('click', async () => {
    if (form.checkValidity()) {
        await generarCarnet();
        // Mostrar el título de resultado final que estaba oculto
        document.getElementById('previewTitle').style.display = 'block';
        canvas.scrollIntoView({ behavior: 'smooth' });
    } else {
        form.reportValidity();
    }
});

// FORMULARIO SUBMIT: Envía a Google Sheets y descarga el PDF
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = true;
    downloadBtn.innerText = "Guardando...";

    await generarCarnet();
    
    // 1. Guardar los datos en el Google Sheet en segundo plano
    const datosAlumno = {
        numero: numeroCarnetActual,
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value
    };

    try {
        await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            mode: 'no-cors', // Evita problemas de CORS
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosAlumno)
        });
    } catch (error) {
        console.error("No se pudo guardar en la base de datos:", error);
    }
    
    // 2. Generar y descargar el PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jspdf.jsPDF('p', 'mm', 'a4');

    const anchoMM = 120; 
    const altoMM = 85;   
    const x = (210 - anchoMM) / 2; 
    const y = 20; 

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    pdf.addImage(imgData, 'JPEG', x, y, anchoMM, altoMM);

    try {
        pdf.addImage('trasera.jpg', 'JPEG', x, y + altoMM, anchoMM, altoMM);
    } catch (error) {
        console.error("Falta el archivo trasera.jpg");
        pdf.setDrawColor(200);
        pdf.rect(x, y + altoMM, anchoMM, altoMM);
    }

    pdf.setLineDash([1, 1], 0);
    pdf.line(x, y + altoMM, x + anchoMM, y + altoMM);

    pdf.save(`Carnet_${document.getElementById('nombre').value}.pdf`);

    // 3. Volver a consultar el siguiente número para el próximo carnet
    obtenerSiguienteNumero().then(() => {
        downloadBtn.disabled = false;
        downloadBtn.innerText = "Descargar PDF";
    });
});
