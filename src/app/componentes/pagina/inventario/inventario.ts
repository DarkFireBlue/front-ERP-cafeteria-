import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

export interface ProductoInventario {
  id?: number;
  nombre?: string;
  descripcion?: string;
  precio?: string | number;
  stock?: number;
  imagen?: string;
  producto?: string;
  cantidad?: number;
  precioUnitario?: string | number;
}

@Component({
  selector: 'app-inventario',
  standalone: true, 
  imports: [CommonModule],
  styleUrl: './inventario.css',
  templateUrl: './inventario.html',
})
export class Inventario implements OnInit {
  productos: ProductoInventario[] = [];
  private apiUrl = 'http://localhost:3000/api/productos';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.http.get<ProductoInventario[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.productos = data.map((item) => ({
          ...item,
          producto: item.nombre || item.producto,
          cantidad: item.stock !== undefined ? item.stock : item.cantidad,
          precioUnitario: item.precio || item.precioUnitario
        }));
        
        console.log('Datos listos para renderizar:', this.productos);
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al conectar con la API:', err);
      }
    });
  }

  agregarProducto(): void {}
}