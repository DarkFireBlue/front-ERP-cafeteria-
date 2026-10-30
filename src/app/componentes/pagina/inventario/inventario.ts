// Componente Standalone de inventario: carga productos y permite altas, ediciones y bajas
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService } from '../../../servicios/producto.service';
import { AuthService } from '../../../servicios/auth.service';
import { validarTexto, validarNumero } from '../../../servicios/http-cliente';

export interface ProductoInventario {
  id?: number;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  precio?: number;
  stock?: number;
  cantidad?: number;
  imagen?: string;
  estado?: string;
  claseEtiqueta?: string;
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './inventario.css',
  templateUrl: './inventario.html',
})
export class Inventario implements OnInit {
  private readonly productoService = inject(ProductoService);
  readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  productos: ProductoInventario[] = [];
  cargando = false;
  mostrarModal = false;
  modoEdicion = false;
  productoEditandoId: number | null = null;
  errorMensaje = '';
  guardando = false;

  // Campos del formulario del modal
  formNombre = '';
  formDescripcion = '';
  formCategoria = 'Bebidas';
  formPrecio = '';
  formStock = '';
  formImagen = '';

  categorias = ['Bebidas', 'Alimentos', 'Postres', 'Insumos', 'Otros'];

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando = true;
    this.productoService.obtenerProductos((error, datos) => {
      this.cargando = false;
      if (!error && Array.isArray(datos)) {
        this.productos = datos;
      }
      this.cdr.detectChanges();
    });
  }

  // Abre el modal listo para registrar un producto nuevo
  agregarProducto(): void {
    this.modoEdicion = false;
    this.productoEditandoId = null;
    this.limpiarFormulario();
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  // Abre el modal con los datos del producto seleccionado para modificarlos
  editarProducto(prod: ProductoInventario): void {
    this.modoEdicion = true;
    this.productoEditandoId = prod.id || null;
    this.formNombre = prod.nombre || '';
    this.formDescripcion = prod.descripcion || '';
    this.formCategoria = prod.categoria || 'Bebidas';
    this.formPrecio = String(prod.precio || 0);
    this.formStock = String(prod.stock ?? prod.cantidad ?? 0);
    this.formImagen = prod.imagen || '';
    this.errorMensaje = '';
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.mostrarModal = false;
    this.cdr.detectChanges();
  }

  // Valida y persiste el producto segun si es alta o edicion
  guardarProducto(): void {
    if (this.guardando) return;

    const errNombre = validarTexto(this.formNombre, 100);
    if (errNombre) { this.errorMensaje = `Nombre: ${errNombre}`; return; }

    const errPrecio = validarNumero(this.formPrecio);
    if (errPrecio) { this.errorMensaje = `Precio: ${errPrecio}`; return; }

    const errStock = validarNumero(this.formStock, true);
    if (errStock) { this.errorMensaje = `Stock: ${errStock}`; return; }

    this.errorMensaje = '';
    this.guardando = true;

    const payload = {
      nombre: this.formNombre.trim(),
      descripcion: this.formDescripcion.trim(),
      categoria: this.formCategoria,
      precio: Number(this.formPrecio),
      stock: Number(this.formStock),
      imagen: this.formImagen.trim()
    };

    const callback = (error: any) => {
      this.guardando = false;
      if (error) {
        this.errorMensaje = error.mensaje || 'Error al guardar el producto';
        this.cdr.detectChanges();
        return;
      }
      this.mostrarModal = false;
      this.cargarProductos();
    };

    if (this.modoEdicion && this.productoEditandoId) {
      this.productoService.editarProducto(this.productoEditandoId, payload, callback);
    } else {
      this.productoService.agregarProducto(payload, callback);
    }
  }

  // Elimina el producto previa confirmacion del usuario
  eliminarProducto(prod: ProductoInventario): void {
    if (!prod.id) return;
    if (!confirm(`Esta seguro de eliminar "${prod.nombre}"?`)) return;

    this.productoService.eliminarProducto(prod.id, (error) => {
      if (error) {
        alert(error.mensaje || 'No fue posible eliminar el producto');
        return;
      }
      this.cargarProductos();
    });
  }

  private limpiarFormulario(): void {
    this.formNombre = '';
    this.formDescripcion = '';
    this.formCategoria = 'Bebidas';
    this.formPrecio = '';
    this.formStock = '';
    this.formImagen = '';
    this.errorMensaje = '';
    this.guardando = false;
  }
}
