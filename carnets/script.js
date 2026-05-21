// ⚠️ PEGA AQUÍ TU URL DE GOOGLE APPS SCRIPT ⚠️
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbxJrZBBdg_HgoKGFqm_Hk0SEsNS5zETTO86yi_U8cPdxIderH5eKtXDOH4YqxeQAL1-/exec";

const form = document.getElementById('carnetForm');
const previewBtn = document.getElementById('previewBtn');
const canvas = document.getElementById('carnetCanvas');
const ctx = canvas.getContext('2d');
let numeroCarnetActual = null;
let carnetProcesadoBase64 = null; // Guardará el resultado final para no repetir trabajo pesado

// Función para obtener el número de carnet en tiempo real desde Google Sheets
async function obtenerSiguienteNumero() {
    try {
        const response = await fetch(URL_GOOGLE_SCRIPT);
        const data = await response.json();
        numeroCarnetActual = data.numero;
        console.log("Siguiente número de carnet obtenido:", numeroCarnetActual);
    } catch (error) {
        console.error("Error al obtener el número de carnet:", error);
        numeroCarnetActual = "??"; 
    }
}

obtenerSiguienteNumero();

// FUNCIÓN DE DIBUJO ULTRA-LIGERA (Sin FileReader, usa ObjectURL nativo)
function dibujarCarnetEstructura() {
    return new Promise((resolve, reject) => {
        const fotoFile = document.getElementById('fotoInput').files[0];
        if (!fotoFile) {
            reject("Falta foto");
            return;
        }

        const plantilla = new Image();
        plantilla.crossOrigin = "Anonymous";
        plantilla.src = 'plantilla.jpg';

        plantilla.onload = function() {
            const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.innerWidth <= 800);
            const escala = esMovil ? 0.5 : 1; 
            
            canvas.width = 1600 * escala;
            canvas.height = 1135 * escala;
            ctx.drawImage(plantilla, 0, 0, canvas.width, canvas.height);

            // Textos
            ctx.fillStyle = '#1a1a1a';
            ctx.font = `bold ${Math.round(45 * escala)}px Arial`;
            ctx.fillText(document.getElementById('nombre').value.toUpperCase(), 599 * escala, 427 * escala);
            ctx.fillText(document.getElementById('apellido').value.toUpperCase(), 599 * escala, 561 * escala);

            ctx.font = `${Math.round(35 * escala)}px Arial`;
            ctx.fillText(document.getElementById('direccion').value, 609 * escala, 808 * escala);
            ctx.fillText(document.getElementById('email').value, 730 * escala, 887 * escala);

            ctx.font = `bold ${Math.round(45 * escala)}px Arial`; 
            ctx.fillText(`Nº ${numeroCarnetActual}`, 1073 * escala, 1019 * escala);

            const hoy = new Date();
            const dia = String(hoy.getDate()).padStart(2, '0');
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const anio = hoy.getFullYear();
            const fechaFormateada = `${dia}/${mes}/${anio}`;

            ctx.font = `bold ${Math.round(22 * escala)}px Arial`;
            ctx.fillText(fechaFormateada, 1073 * escala, 1085 * escala); 

            // TRUCO MAESTRO: URL de objeto en lugar de FileReader (Consumo de RAM = 0)
            const urlTemporalFoto = URL.createObjectURL(fotoFile);
            const fotoImg = new Image();
            
            fotoImg.onload = function() {
                const mX = 48 * escala, mY = 335 * escala, mAncho = 477 * escala, mAlto = 650 * escala;
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
                
                // Extraemos el resultado una sola vez y con compresión optimizada (0.65)
                carnetProcesadoBase64 = canvas.toDataURL('image/jpeg', 0.65);
                
                // Liberamos la memoria del móvil inmediatamente
                URL.revokeObjectURL(urlTemporalFoto);
                resolve();
            };
            
            fotoImg.onerror = () => {
                URL.revokeObjectURL(urlTemporalFoto);
                reject("Error al cargar foto");
            };
            fotoImg.src = urlTemporalFoto;
        };
        plantilla.onerror = () => reject("Error plantilla");
    });
}

// Disparador inteligente: Dibuja el carnet de forma pasiva en cuanto cambian los datos o la foto
form.addEventListener('change', () => {
    if(document.getElementById('fotoInput').files[0]) {
        dibujarCarnetEstructura().catch(e => console.log("Dibujo en espera: " + e));
    }
});

// VISTA PREVIA (Instantánea porque el trabajo ya está hecho)
previewBtn.addEventListener('click', async () => {
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    try {
        previewBtn.innerText = "Mostrando...";
        previewBtn.disabled = true;
        
        // Si por algún motivo no se procesó antes de hacer clic, lo forzamos una vez
        if (!carnetProcesadoBase64) {
            await dibujarCarnetEstructura();
        }
        
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
        
        imagenExistente.src = carnetProcesadoBase64;
        canvas.style.display = "none"; 
        
        imagenExistente.scrollIntoView({ behavior: 'smooth' });
        previewBtn.innerText = "Vista Previa";
        previewBtn.disabled = false;
    } catch(e) {
        alert("Por favor, rellena los datos y selecciona una foto primero.");
        previewBtn.disabled = false;
        previewBtn.innerText = "Vista Previa";
    }
});

// FORMULARIO SUBMIT
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = true;
    downloadBtn.innerText = "Guardando...";

    try {
        if (!carnetProcesadoBase64) {
            await dibujarCarnetEstructura();
        }
    } catch(err) {
        alert("Error: Asegúrate de rellenar el formulario y subir una foto.");
        downloadBtn.disabled = false;
        downloadBtn.innerText = "Descargar PDF";
        return;
    }
    
    // Envío de datos a Sheets (Mundo asíncrono aislado)
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
        console.error("Error BD:", error);
    }
    
    // DETECTOR MÓVIL
    const esPantallaPequena = window.innerWidth <= 800;
    const esTactil = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const esUserAgentMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (esUserAgentMovil || esPantallaPequena || esTactil) {
        // RENDERIZADO FLOTANTE INMEDIATO (Cero carga de CPU)
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
                ¡Datos guardados correctamente!<br><br>
                <b>Mantén pulsada la imagen</b> de abajo y selecciona <b>"Descargar imagen"</b> para guardarla en tu carrete/galería.
            </p>
            <img src="${carnetProcesadoBase64}" style="width:100%; max-width:340px; border-radius:15px; margin: 10px 0; border:2px solid #9900ff; box-shadow: 0 5px 15px rgba(0,0,0,0.1);"/>
            <br>
            <button id="cerrarAvisoBtn" style="background:linear-gradient(135deg, #0062ff, #9900ff); color:white; border:none; padding:12px 35px; border-radius:50px; font-weight:bold; font-size:16px; margin-top:15px; cursor:pointer;">
                Volver
            </button>
        `;
        
        document.body.appendChild(aviso);
        
        document.getElementById('cerrarAvisoBtn').addEventListener('click', () => {
            document.body.removeChild(aviso);
        });

        downloadBtn.disabled = false;
        downloadBtn.innerText = "Descargar PDF";

    } else {
        // MODO PC: Solo aquí se invoca a jsPDF
        if (typeof window.jspdf !== 'undefined') {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const anchoMM = 120; 
            const altoMM = 85;   
            const x = (210 - anchoMM) / 2; 
            const y = 20; 

            pdf.addImage(carnetProcesadoBase64, 'JPEG', x, y, anchoMM, altoMM);

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
    }

    // Resetear variable al terminar para el siguiente alumno
    carnetProcesadoBase64 = null;
    obtenerSiguienteNumero().then(() => {
        downloadBtn.disabled = false;
        downloadBtn.innerText = "Descargar PDF";
    });
});
