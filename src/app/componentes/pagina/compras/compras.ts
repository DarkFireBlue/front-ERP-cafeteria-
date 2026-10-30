// Componente Standalone de compras: listado de ordenes, proveedores y registro de nuevas compras
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompraService } from '../../../servicios/compra.service';
import { ProveedorService } from '../../../servicios/proveedor.service';
import { ProductoService } from '../../../servicios/producto.service';
import { AuthService } from '../../../servicios/auth.service';
import { validarTexto, validarNumero } from '../../../servicios/http-cliente';

export interface CompraItem {
  id?: number;
  folio: string;
  proveedor: string;
  total: string;
  fecha: string;
  estado: string;
  articulos?: number;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-compras',
  standalone: true,
  styleUrl: './compras.css',
  templateUrl: './compras.html',
})
export class Compras implements OnInit {
  readonly authService = inject(AuthService);
  private readonly compraService = inject(CompraService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly productoService = inject(ProductoService);
  private readonly cdr = inject(ChangeDetectorRef);

  compras: CompraItem[] = [];
  proveedores: any[] = [];
  productos: any[] = [];
  cargando = false;

  // Modal de nueva compra
  mostrarModal = false;
  guardando = false;
  errorMensaje = '';

  formProveedorId = '';
  formObservaciones = '';

  // Filas de detalle de productos en la compra
  detalleCompra: { producto_id: string; cantidad: string; precio_unitario: string }[] = [];

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.compraService.obtenerCompras((error, datos) => {
      this.cargando = false;
      if (!error && Array.isArray(datos)) {
        this.compras = datos;
      }
      this.cdr.detectChanges();
    });

    this.proveedorService.obtenerProveedores((error, datos) => {
      if (!error && Array.isArray(datos)) {
        this.proveedores = datos;
        this.cdr.detectChanges();
      }
    });

    this.productoService.obtenerProductos((error, datos) => {
      if (!error && Array.isArray(datos)) {
        this.productos = datos;
        this.cdr.detectChanges();
      }
    });
  }

  agregarCompra(): void {
    this.formProveedorId = '';
    this.formObservaciones = '';
    this.detalleCompra = [{ producto_id: '', cantidad: '', precio_unitario: '' }];
    this.errorMensaje = '';
    this.guardando = false;
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.mostrarModal = false;
    this.cdr.detectChanges();
  }

  agregarLinea(): void {
    this.detalleCompra.push({ producto_id: '', cantidad: '', precio_unitario: '' });
    this.cdr.detectChanges();
  }

  eliminarLinea(indice: number): void {
    if (this.detalleCompra.length <= 1) return;
    this.detalleCompra.splice(indice, 1);
    this.cdr.detectChanges();
  }

  // Al seleccionar producto se autocompleta el precio del catalogo
  onProductoLineaSeleccionado(indice: number): void {
    const idProd = this.detalleCompra[indice].producto_id;
    const prod = this.productos.find((p) => String(p.id) === idProd);
    if (prod) {
      this.detalleCompra[indice].precio_unitario = String(prod.precio || 0);
    }
  }

  guardarCompra(): void {
    if (this.guardando) return;

    if (!this.formProveedorId) {
      this.errorMensaje = 'Seleccione un proveedor.';
      return;
    }

    for (const [i, linea] of this.detalleCompra.entries()) {
      if (!linea.producto_id) { this.errorMensaje = `Fila ${i + 1}: seleccione un producto.`; return; }
      const errC = validarNumero(linea.cantidad, true);
      if (errC) { this.errorMensaje = `Fila ${i + 1} - Cantidad: ${errC}`; return; }
      const errP = validarNumero(linea.precio_unitario);
      if (errP) { this.errorMensaje = `Fila ${i + 1} - Precio: ${errP}`; return; }
    }

    this.errorMensaje = '';
    this.guardando = true;

    const payload = {
      proveedor_id: Number(this.formProveedorId),
      observaciones: this.formObservaciones.trim(),
      detalle: this.detalleCompra.map((d) => ({
        producto_id: Number(d.producto_id),
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario)
      }))
    };

    this.compraService.crearCompra(payload, (error) => {
      this.guardando = false;
      if (error) {
        this.errorMensaje = error.mensaje || 'Error al registrar la compra.';
        this.cdr.detectChanges();
        return;
      }
      this.mostrarModal = false;
      this.cargarDatos();
    });
  }
}
