// Variables
const carrito = document.querySelector('#carrito');
const listaCursos = document.querySelector('#lista-cursos');
const contenedorCarrito = document.querySelector('#lista-carrito tbody');
const vaciarCarritoBtn = document.querySelector('#vaciar-carrito');
const comprarAhoraBtn = document.querySelector('#comprar-ahora');
const contadorCarrito = document.querySelector('#contador-carrito');
const totalCompra = document.querySelector('#total-compra');
const pagoPaypal = document.querySelector('#pago-paypal');
let articulosCarrito = JSON.parse(localStorage.getItem('carrito') || '[]');
let paypalRenderizado = false;

// Listeners
cargarEventListeners();

// Carga el carrito guardado al abrir la página
carritoHTML();

function cargarEventListeners() {
     // Dispara cuando se presiona "Agregar Carrito"
     listaCursos.addEventListener('click', agregarCurso);

     // Cuando se elimina un curso del carrito
     carrito.addEventListener('click', eliminarCurso);

     // Al Vaciar el carrito
     vaciarCarritoBtn.addEventListener('click', vaciarCarritoCompleto);

     // Al presionar "Comprar ahora"
     comprarAhoraBtn.addEventListener('click', comprarAhora);

}




// Funciones
// Función que añade el curso al carrito
function agregarCurso(e) {
     e.preventDefault();
     // Delegation para agregar-carrito
     if(e.target.classList.contains('agregar-carrito')) {
          const curso = e.target.parentElement.parentElement;
          // Enviamos el curso seleccionado para tomar sus datos
          leerDatosCurso(curso);
     }
}

// Lee los datos del curso
function leerDatosCurso(curso) {
     const infoCurso = {
          imagen: curso.querySelector('img').src,
          titulo: curso.querySelector('h4').textContent,
          precio: curso.querySelector('.precio span').textContent,
          id: curso.querySelector('a').getAttribute('data-id'), 
          cantidad: 1
     }


     if( articulosCarrito.some( curso => curso.id === infoCurso.id ) ) { 
          const cursos = articulosCarrito.map( curso => {
               if( curso.id === infoCurso.id ) {
                    curso.cantidad++;
                     return curso;
                } else {
                     return curso;
             }
          })
          articulosCarrito = [...cursos];
     }  else {
          articulosCarrito = [...articulosCarrito, infoCurso];
     }

     // console.log(articulosCarrito)

     

     // console.log(articulosCarrito)
     carritoHTML();
}

// Elimina el curso del carrito en el DOM
function eliminarCurso(e) {
     e.preventDefault();
     if(e.target.classList.contains('borrar-curso') ) {
          // e.target.parentElement.parentElement.remove();
          const cursoId = e.target.getAttribute('data-id')
          
          // Eliminar del arreglo del carrito
          articulosCarrito = articulosCarrito.filter(curso => curso.id !== cursoId);

          carritoHTML();
     }
}


// Muestra el curso seleccionado en el Carrito
function carritoHTML() {

     vaciarCarrito();

     articulosCarrito.forEach(curso => {
          const row = document.createElement('tr');
          row.innerHTML = `
               <td>  
                    <img src="${curso.imagen}" width=100>
               </td>
               <td>${curso.titulo}</td>
               <td>${curso.precio}</td>
               <td>${curso.cantidad} </td>
               <td>
                    <a href="#" class="borrar-curso" data-id="${curso.id}">X</a>
               </td>
          `;
          contenedorCarrito.appendChild(row);
     });

     actualizarContador();
     actualizarTotal();
     sincronizarPago();
     guardarCarrito();

}

// Guarda el carrito en el navegador (persistente)
function guardarCarrito() {
     localStorage.setItem('carrito', JSON.stringify(articulosCarrito));
}

// Elimina los cursos del carrito en el DOM
function vaciarCarrito() {
     // forma lenta
     // contenedorCarrito.innerHTML = '';


     // forma rapida (recomendada)
     while(contenedorCarrito.firstChild) {
          contenedorCarrito.removeChild(contenedorCarrito.firstChild);
      }
}

// Vacía el carrito por completo (arreglo + DOM)
function vaciarCarritoCompleto(e) {
     if (e) { e.preventDefault(); }
     articulosCarrito = [];
     carritoHTML();
}

// Actualiza el contador de productos en el icono del carrito
function actualizarContador() {
     if (!contadorCarrito) return;
     const total = articulosCarrito.reduce((sum, curso) => sum + curso.cantidad, 0);
     contadorCarrito.textContent = total;
     contadorCarrito.classList.toggle('visible', total > 0);
}

// Convierte "$15" / "15" a número
function parsePrecio(precio) {
     return parseFloat(String(precio).replace(/[^0-9.]/g, '')) || 0;
}

// Muestra el total a pagar
function actualizarTotal() {
     if (!totalCompra) return;
     if (articulosCarrito.length === 0) {
          totalCompra.textContent = '';
          return;
     }
     const total = articulosCarrito.reduce((sum, curso) => sum + parsePrecio(curso.precio) * curso.cantidad, 0);
     totalCompra.textContent = `Total a pagar: $${total.toFixed(2)} USD`;
}

// Muestra/oculta el área de pago y renderiza los botones de PayPal si hace falta
function sincronizarPago() {
     if (!pagoPaypal) return;
     if (articulosCarrito.length > 0) {
          pagoPaypal.style.display = 'block';
          renderPayPalButtons();
     } else {
          pagoPaypal.style.display = 'none';
     }
}

// Botón "Comprar ahora"
function comprarAhora(e) {
     e.preventDefault();
     if (articulosCarrito.length === 0) {
          resultMessage('Tu carrito está vacío. Agrega al menos un producto para comprar.');
          return;
     }
     sincronizarPago();
     if (pagoPaypal) {
          pagoPaypal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
     }
}





/* Boton de PayPal */
function renderPayPalButtons() {
     if (paypalRenderizado || !window.paypal) return;
     paypalRenderizado = true;

     window.paypal
  .Buttons({
    async createOrder() {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // Enviamos los articulos reales del carrito
          body: JSON.stringify({
            cart: articulosCarrito,
          }),
        });
        
        const orderData = await response.json();
        
        if (orderData.id) {
          return orderData.id;
        } else {
          const errorDetail = orderData?.details?.[0];
          const errorMessage = errorDetail
            ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
            : JSON.stringify(orderData);
          
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error(error);
        resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
      }
    },
    async onApprove(data, actions) {
      try {
        const response = await fetch(`/api/orders/${data.orderID}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        const orderData = await response.json();
        // Three cases to handle:
        //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
        //   (2) Other non-recoverable errors -> Show a failure message
        //   (3) Successful transaction -> Show confirmation or thank you message
        
        const errorDetail = orderData?.details?.[0];
        
        if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
          // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
          // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
          return actions.restart();
        } else if (errorDetail) {
          // (2) Other non-recoverable errors -> Show a failure message
          throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
        } else if (!orderData.purchase_units) {
          throw new Error(JSON.stringify(orderData));
        } else {
          // (3) Successful transaction -> Show confirmation or thank you message
          // Or go to another URL:  actions.redirect('thank_you.html');
          const transaction =
            orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
            orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
          resultMessage(
            `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`,
          );
          console.log(
            "Capture result",
            orderData,
            JSON.stringify(orderData, null, 2),
          );
          // Pago exitoso: vaciar el carrito
          articulosCarrito = [];
          carritoHTML();
        }
      } catch (error) {
        console.error(error);
        resultMessage(
          `Sorry, your transaction could not be processed...<br><br>${error}`,
        );
      }
    },
  })
  .render("#paypal-button-container");
}
  
// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
  const container = document.querySelector("#result-message");
  if (container) {
    container.innerHTML = message;
  } else {
    console.log(message);
  }
}