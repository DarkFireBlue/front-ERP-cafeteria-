// Componente Standalone de ventas: listado, nueva venta manual y visor de factura XML
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentaService } from '../../../servicios/venta.service';
import { ProductoService } from '../../../servicios/producto.service';
import { AuthService } from '../../../servicios/auth.service';
import { PaypalService } from '../../../servicios/paypal.service';
import { validarTexto, validarNumero } from '../../../servicios/http-cliente';

export interface ResumenVentas {
  ventasHoy: number | string;
  totalDia: string;
  ivaAcumulado: string;
}

export interface Venta {
  id?: number;
  folio: string;
  cliente: string;
  canal: string;
  total: string;
  iva: string;
  estadoFactura: string;
  claseEstado: string;
  factura_id?: number;
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './ventas.css',
  templateUrl: './ventas.html',
})
export class Ventas implements OnInit {
  readonly authService = inject(AuthService);
  private readonly ventaService = inject(VentaService);
  private readonly productoService = inject(ProductoService);
  private readonly paypalService = inject(PaypalService);
  private readonly cdr = inject(ChangeDetectorRef);

  resumen: ResumenVentas = { ventasHoy: 0, totalDia: '$0.00', ivaAcumulado: '$0.00' };
  ventas: Venta[] = [];
  productosLista: any[] = [];

  // Control del modal de nueva venta manual
  mostrarModal = false;
  cargando = false;
  errorMensaje = '';

  formNombreCliente = '';
  formCorreoCliente = '';
  formProductoId = '';
  formCantidad = '';
  formPrecioUnitario = '';

  // Control del modal de factura XML
  mostrarModalFactura = false;
  facturaSeleccionada: any = null;

  // Control del modal de pago PayPal en linea
  mostrarModalPaypal = false;
  procesandoPaypal = false;
  mensajePaypal = '';
  estadoPaypal: 'NINGUNO' | 'APROBADO' | 'RECHAZADO' = 'NINGUNO';
  ordenPaypalId = '';
  folioPaypal = '';

  ngOnInit(): void {
    this.verificarRetornoPaypal();
    this.cargarDatos();
  }

  // Verifica si venimos de regreso de la pasarela de PayPal
  verificarRetornoPaypal(): void {
    const params = new URLSearchParams(window.location.search);
    const tokenPayPal = params.get('token'); // orderID de PayPal retornado
    const cancelado = params.get('cancel');

    if (cancelado) {
      alert('El pago con PayPal fue cancelado.');
      sessionStorage.removeItem('paypal_orden_id');
      sessionStorage.removeItem('paypal_datos_venta');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const orderIdGuardado = sessionStorage.getItem('paypal_orden_id');
    const orderID = tokenPayPal || orderIdGuardado;

    if (orderID && sessionStorage.getItem('paypal_datos_venta')) {
      let datosVenta: any = {};
      try {
        datosVenta = JSON.parse(sessionStorage.getItem('paypal_datos_venta') || '{}');
      } catch (_) {}

      this.cargando = true;
      this.paypalService.capturarOrden(orderID, datosVenta, (error, respuesta) => {
        this.cargando = false;
        sessionStorage.removeItem('paypal_orden_id');
        sessionStorage.removeItem('paypal_datos_venta');
        window.history.replaceState({}, document.title, window.location.pathname);

        if (error) {
          alert('Error al capturar el pago con PayPal: ' + (error.mensaje || error));
          return;
        }

        if (respuesta && respuesta.estado === 'APROBADO') {
          alert(`¡Pago completado con éxito! Folio: ${respuesta.folio}. La factura XML ha sido enviada a tu correo.`);
          this.cargarDatos();
        }
      });
    }
  }

  esAdmin(): boolean {
    return this.authService.esAdmin();
  }

  cargarDatos(): void {
    // Cargar catalogo para que este disponible al pagar con PayPal tanto para admin como para cliente
    this.productoService.obtenerProductos((error, datos) => {
      if (!error && Array.isArray(datos)) {
        this.productosLista = datos.filter((p: any) => Number(p.stock ?? p.cantidad) > 0);
        this.cdr.detectChanges();
      }
    });

    if (this.esAdmin()) {
      this.ventaService.obtenerResumen((error, datos) => {
        if (!error && datos) {
          this.resumen = datos;
          this.cdr.detectChanges();
        }
      });
    }

    const clienteId = this.esAdmin() ? undefined : (this.authService.obtenerUsuarioId() ?? undefined);
    this.ventaService.obtenerVentas((error, datos) => {
      if (!error && Array.isArray(datos)) {
        this.ventas = datos;
        this.cdr.detectChanges();
      }
    }, clienteId);
  }

  // --- Nueva venta manual (administrador) ---
  nuevaVenta(): void {
    this.formNombreCliente = 'Publico general';
    this.formCorreoCliente = '';
    this.formProductoId = '';
    this.formCantidad = '';
    this.formPrecioUnitario = '';
    this.errorMensaje = '';
    this.cargando = false;
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    if (this.cargando) return;
    this.mostrarModal = false;
    this.cdr.detectChanges();
  }

  // Al seleccionar un producto, rellena automaticamente el precio unitario
  onProductoSeleccionado(): void {
    const prod = this.productosLista.find((p) => String(p.id) === this.formProductoId);
    if (prod) {
      this.formPrecioUnitario = String(prod.precio || 0);
    }
  }

  guardarVenta(): void {
    if (this.cargando) return;

    const errNombre = validarTexto(this.formNombreCliente, 100);
    if (errNombre) { this.errorMensaje = `Cliente: ${errNombre}`; return; }

    if (!this.formProductoId) { this.errorMensaje = 'Seleccione un producto.'; return; }

    const errCant = validarNumero(this.formCantidad, true);
    if (errCant) { this.errorMensaje = `Cantidad: ${errCant}`; return; }

    const errPrecio = validarNumero(this.formPrecioUnitario);
    if (errPrecio) { this.errorMensaje = `Precio: ${errPrecio}`; return; }

    this.errorMensaje = '';
    this.cargando = true;

    this.ventaService.crearVenta({
      nombre_cliente: this.formNombreCliente.trim(),
      correo_cliente: this.formCorreoCliente.trim(),
      metodo_pago: 'Efectivo',
      canal: 'Local',
      detalle: [{
        producto_id: Number(this.formProductoId),
        cantidad: Number(this.formCantidad),
        precio_unitario: Number(this.formPrecioUnitario)
      }]
    }, (error) => {
      this.cargando = false;
      if (error) {
        this.errorMensaje = error.mensaje || 'Error al registrar la venta.';
        this.cdr.detectChanges();
        return;
      }
      this.mostrarModal = false;
      this.cargarDatos();
    });
  }

  // --- Modal de pago PayPal en linea ---
  abrirModalPaypal(): void {
    this.mensajePaypal = '';
    this.estadoPaypal = 'NINGUNO';
    this.ordenPaypalId = '';
    this.procesandoPaypal = false;
    this.mostrarModalPaypal = true;
    this.cdr.detectChanges();
  }

  cerrarModalPaypal(): void {
    if (this.procesandoPaypal) return;
    this.mostrarModalPaypal = false;
    this.cdr.detectChanges();
  }

  // Crea la orden de PayPal y redirige al cliente al portal de aprobacion
  iniciarPagoPaypal(): void {
    if (!this.formProductoId || !this.formCantidad) {
      this.mensajePaypal = 'Seleccione un producto y cantidad para pagar con PayPal.';
      return;
    }
    this.procesandoPaypal = true;
    this.mensajePaypal = 'Creando orden en PayPal Sandbox...';

    const prod = this.productosLista.find((p) => String(p.id) === this.formProductoId);
    if (!prod) { this.mensajePaypal = 'Producto no encontrado.'; this.procesandoPaypal = false; return; }

    this.paypalService.crearOrden({
      productos: [{
        id: prod.id,
        nombre: prod.nombre,
        precio: prod.precio,
        cantidad: Number(this.formCantidad)
      }],
      cliente: {
        nombre: this.formNombreCliente || 'Cliente',
        correo: this.formCorreoCliente,
        rfc: 'XAXX010101000'
      }
    }, (error, datos) => {
      this.procesandoPaypal = false;
      if (error) {
        this.mensajePaypal = error.mensaje || 'Error al crear la orden en PayPal.';
        this.cdr.detectChanges();
        return;
      }
      // Guardar datos de la venta para recuperarlos al retornar de PayPal
      sessionStorage.setItem('paypal_orden_id', datos.orderID || datos.id);
      sessionStorage.setItem('paypal_datos_venta', JSON.stringify({
        nombre_cliente: this.formNombreCliente,
        correo_cliente: this.formCorreoCliente,
        detalle: [{ producto_id: prod.id, cantidad: Number(this.formCantidad) }]
      }));
      // Redirigir al portal de aprobacion de PayPal Sandbox
      if (datos.approveUrl || datos.urlPago) {
        window.location.href = datos.approveUrl || datos.urlPago;
      } else {
        this.mensajePaypal = 'No se obtuvo la URL de aprobacion de PayPal.';
        this.cdr.detectChanges();
      }
    });
  }

  // --- Visor de factura XML ---
  verFactura(item: Venta): void {
    const clienteId = this.esAdmin() ? null : this.authService.obtenerUsuarioId();
    const criterio = item.folio || String(item.id);
    this.ventaService.obtenerFactura(criterio, (error, datos) => {
      if (error || !datos) {
        alert('No se encontro la factura XML para esta venta.');
        return;
      }
      this.facturaSeleccionada = datos;
      this.mostrarModalFactura = true;
      this.cdr.detectChanges();
    }, clienteId);
  }

  cerrarModalFactura(): void {
    this.mostrarModalFactura = false;
    this.facturaSeleccionada = null;
    this.cdr.detectChanges();
  }

  // Descarga el archivo XML como comprobante fiscal
  descargarXML(): void {
    if (!this.facturaSeleccionada?.archivo_xml) {
      alert('No hay archivo XML disponible para descargar.');
      return;
    }
    const blob = new Blob([this.facturaSeleccionada.archivo_xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factura-${this.facturaSeleccionada.folio || this.facturaSeleccionada.id || 'CFDI'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
