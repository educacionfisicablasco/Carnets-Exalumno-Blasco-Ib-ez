// ⚠️ PEGA AQUÍ TU URL DE GOOGLE APPS SCRIPT ⚠️
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbxJrZBBdg_HgoKGFqm_Hk0SEsNS5zETTO86yi_U8cPdxIderH5eKtXDOH4YqxeQAL1-/exec";

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
        // FIX MÓVILES: Evita que el canvas se bloquee por seguridad al exportar en Safari/Chrome móvil
        plantilla.crossOrigin = "Anonymous";
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

            // --- DIBUJAR NÚMERO DE CARNET AUTOMÁTICO ---
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
        try {
            previewBtn.innerText = "Generando...";
            previewBtn.disabled = true;
            
            await generarCarnet();
            
            // FIX ANDROID/MÓVIL: Convertimos el canvas a imagen real para asegurar que se vea
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            let contenedorPreview = document.getElementById('previewTitle');
            if (contenedorPreview) contenedorPreview.style.display = 'block';
            
            let imagenExistente = document.getElementById('carnetImgReal');
            if (!imagenExistente) {
                imagenExistente = document.createElement('img');
                imagenExistente.id = 'carnetImgReal';
                imagenExistente.style.maxWidth = '100%';
                imagenExistente.style.borderRadius = '15px';
                imagenExistente.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                canvas.parentNode.insertBefore(imagenExistente, canvas.nextSibling);
            }
            
            imagenExistente.src = imgData;
            canvas.style.display = "none"; // Ocultamos el canvas conflictivo en móvil
            
            imagenExistente.scrollIntoView({ behavior: 'smooth' });
            previewBtn.innerText = "Vista Previa";
            previewBtn.disabled = false;
        } catch(e) {
            alert("Error en vista previa: " + e);
            previewBtn.disabled = false;
            previewBtn.innerText = "Vista Previa";
        }
    } else {
        form.reportValidity();
    }
});

// FORMULARIO SUBMIT: Envía a Google Sheets y muestra descarga
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = true;
    downloadBtn.innerText = "Guardando...";

    try {
        await generarCarnet();
    } catch(err) {
        alert("Error al procesar el carnet: " + err);
        downloadBtn.disabled = false;
        downloadBtn.innerText = "Descargar PDF";
        return;
    }
    
    // 1. Guardar los datos en el Google Sheet
    const datosAlumno = {
        numero: numeroCarnetActual,
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value
    };

    try {
        await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosAlumno)
        });
    } catch (error) {
        console.error("Error al guardar en la base de datos:", error);
    }
    
    // 2. DETECTOR DE MÓVIL REFORZADO (Filtra pantallas pequeñas, pantallas táctiles y UserAgent)
    const esPantallaPequena = window.innerWidth <= 800;
    const esTactil = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const esUserAgentMovil = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Si cumple cualquiera de las tres, se activa el modo móvil
    if (esUserAgentMovil || esPantallaPequena || esTactil) {
        
        // Convertimos a imagen de alta calidad
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Creamos el cartel flotante de emergencia
        const aviso = document.createElement('div');
        aviso.style.position = 'fixed';
        aviso.style.top = '5%';
        aviso.style.left = '5%';
        aviso.style.width = '90%';
        aviso.style.maxHeight = '90%';
        aviso.style.overflowY = 'auto';
        aviso.style.backgroundColor = '#ffffff';
        aviso.style.boxShadow = '0 20px 60px rgba(0,0,0,0.4)';
        aviso.style.borderRadius = '25px';
        aviso.style.padding = '25px';
        aviso.style.zIndex = '999999';
        aviso.style.textAlign = 'center';
        aviso.style.fontFamily = 'sans-serif';
        aviso.style.boxSizing = 'border-box';
        
        aviso.innerHTML = `
            <h3 style="color:#1e293b; margin-top:0; font-size:22px; font-weight:800;">¡Tu Carnet está listo!</h3>
            <p style="color:#475569; font-size:14px; line-height:1.4; margin-bottom:15px;">
                Debido a las normas de seguridad de tu móvil, debes guardarlo manualmente:<br>
                <b>Mantén pulsada la imagen</b> y selecciona <b>"Descargar imagen"</b> (o "Guardar en carrete").
            </p>
            <img src="${imgData}" style="width:100%; max-width:340px; border-radius:15px; margin: 10px 0; border:2px solid #9900ff; box-shadow: 0 5px 15px rgba(0,0,0,0.1);"/>
            <br>
            <button id="cerrarAvisoBtn" style="background:linear-gradient(135deg, #0062ff, #9900ff); color:white; border:none; padding:12px 35px; border-radius:50px; font-weight:bold; font-size:16px; margin-top:15px; cursor:pointer; box-shadow:0 5px 15px rgba(0,98,255,0.3);">
                Volver al formulario
            </button>
        `;
        
        document.body.appendChild(aviso);
        
        document.getElementById('cerrarAvisoBtn').addEventListener('click', () => {
            document.body.removeChild(aviso);
        });

        downloadBtn.disabled = false;
        downloadBtn.innerText = "Descargar PDF";

    } else {
        // En ordenadores (PC/Mac) el sistema jsPDF tradicional de descarga directa
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const anchoMM = 120; 
        const altoMM = 85;   
        const x = (210 - anchoMM) / 2; 
        const y = 20; 

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', x, y, anchoMM, altoMM);

        try {
            pdf.addImage('trasera.jpg', 'JPEG', x, y + altoMM, anchoMM, altoMM);
        } catch (e) {
            pdf.setDrawColor(200);
            pdf.rect(x, y + altoMM, anchoMM, altoMM);
        }

        pdf.setLineDash([1, 1], 0);
        pdf.line(x, y + altoMM, x + anchoMM, y + altoMM);
        
        pdf.save(`Carnet_${document.getElementById('nombre').value}.pdf`);
    }

    // 3. Actualizar número para el próximo carnet
    obtenerSiguienteNumero().then(() => {
        downloadBtn.disabled = false;
        downloadBtn.innerText = "Descargar PDF";
    });
});
