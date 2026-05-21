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
        numeroCarnetActual = "??"; 
    }
}

obtenerSiguienteNumero();

// FUNCIÓN AUXILIAR: Comprime la foto del usuario para que el móvil no se sature de RAM
function optimizarImagenUsuario(file, maxAncho, maxAlto) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const tempCanvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxAncho) {
                        height *= maxAncho / width;
                        width = maxAncho;
                    }
                } else {
                    if (height > maxAlto) {
                        width *= maxAlto / height;
                        height = maxAlto;
                    }
                }
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0, width, height);
                
                // Devolvemos la imagen ultra-comprimida en JPEG de baja carga
                resolve(tempCanvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// FUNCIÓN DE DIBUJO OPTIMIZADA
async function generarCarnet() {
    return new Promise((resolve, reject) => {
        const plantilla = new Image();
        plantilla.crossOrigin = "Anonymous";
        plantilla.src = 'plantilla.jpg';

        plantilla.onload = async function() {
            const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.innerWidth <= 800);
            const escala = esMovil ? 0.5 : 1;
            
            canvas.width = 1600 * escala;
            canvas.height = 1135 * escala;
            ctx.drawImage(plantilla, 0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#1a1a1a';
            ctx.font = `bold ${Math.round(45 * escala)}px Arial`;
            ctx.fillText(document.getElementById('nombre').value.toUpperCase(), 599 * escala, 427 * escala);
            ctx.fillText(document.getElementById('apellido').value.toUpperCase(), 599 * escala, 561 * escala);

            ctx.font = `${Math.round(35 * escala)}px Arial`;
            ctx.fillText(document.getElementById('direccion').value, 609 * escala, 808 * escala);
            ctx.fillText(document.getElementById('email').value, 730 * escala, 887 * escala);

            ctx.fillStyle = '#1a1a1a'; 
            ctx.font = `bold ${Math.round(45 * escala)}px Arial`; 
            ctx.fillText(`Nº ${numeroCarnetActual}`, 1073 * escala, 1019 * escala);

            const hoy = new Date();
            const dia = String(hoy.getDate()).padStart(2, '0');
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const anio = hoy.getFullYear();
            const fechaFormateada = `${dia}/${mes}/${anio}`;

            ctx.font = `bold ${Math.round(22 * escala)}px Arial`;
            ctx.fillText(fechaFormateada, 1073 * escala, 1085 * escala); 

            const fotoFile = document.getElementById('fotoInput').files[0];
            if (!fotoFile) {
                alert("Selecciona una foto.");
                return;
            }

            try {
                // Comprimimos la foto del alumno sobre la marcha a un tamaño ridículamente ligero para la RAM
                const fotoReducidaBase64 = await optimizarImagenUsuario(fotoFile, 500, 700);
                
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
                    canvas.style.display = "inline-block";
                    resolve();
                };
                fotoImg.src = fotoReducidaBase64;
            } catch (err) {
                reject("Error al procesar la foto del usuario: " + err);
            }
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
            
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            
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
            canvas.style.display = "none"; 
            
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

// FORMULARIO SUBMIT
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = true;
    downloadBtn.innerText = "Guardando...";

    try {
        await generarCarnet();
    } catch(err) {
        alert("Error al procesar: " + err);
        downloadBtn.disabled = false;
        downloadBtn.innerText = "Descargar PDF";
        return;
    }
    
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
    
    const esPantallaPequena = window.innerWidth <= 800;
    const esTactil = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const esUserAgentMovil = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (esUserAgentMovil || esPantallaPequena || esTactil) {
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        
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
                Debido a los bloqueos de seguridad de tu navegador móvil:<br>
                <b>Mantén pulsada la imagen</b> de abajo y selecciona <b>"Descargar imagen"</b> para guardarla en tu galería.
            </p>
            <img src="${imgData}" style="width:100%; max-width:340px; border-radius:15px; margin: 10px 0; border:2px solid #9900ff; box-shadow: 0 5px 15px rgba(0,0,0,0.1);"/>
            <br>
            <button id="cerrarAvisoBtn" style="background:linear-gradient(135deg, #0062ff, #9900ff); color:white; border:none; padding:12px 35px; border-radius:50px; font-weight:bold; font-size:16px; margin-top:15px; cursor:pointer;">
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
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const anchoMM = 120; 
        const altoMM = 85;   
        const x = (210 - anchoMM) / 2; 
        const y = 20; 

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
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

    obtenerSiguienteNumero().then(() => {
        downloadBtn.disabled = false;
        downloadBtn.innerText = "Descargar PDF";
    });
});
