import { Component, signal } from '@angular/core';
import { ProductService } from '@/pages/service/product.service';
import { Product } from '@/types/product';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@Component({
    selector: 'sales-table-widget',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, RippleModule],
    template: `<div class="card">
        <p-table [value]="products()" [paginator]="true" [rows]="8" [tableStyle]="{ 'min-width': '40rem' }">
            <ng-template #header>
                <tr>
                    <th style="width:5rem">Image</th>
                    <th pSortableColumn="name" style="min-width:14rem">
                        Name
                        <p-sortIcon field="name"></p-sortIcon>
                    </th>
                    <th pSortableColumn="category" style="min-width:8rem">
                        Category
                        <p-sortIcon field="category"></p-sortIcon>
                    </th>
                    <th pSortableColumn="price" style="min-width:8rem">
                        Price
                        <p-sortIcon field="price"></p-sortIcon>
                    </th>
                    <th style="width:5rem">View</th>
                </tr>
            </ng-template>
            <ng-template #body let-product>
                <tr>
                    <td>
                        <img [src]="'/images/product/' + product.image" [alt]="product.image" width="50px" class="shadow-lg w-12" />
                    </td>
                    <td>
                        {{ product.name }}
                    </td>
                    <td>
                        {{ product.category }}
                    </td>
                    <td>
                        {{ product.price | currency: 'USD' }}
                    </td>
                    <td>
                        <button pRipple pButton type="button" icon="pi pi-search" rounded text class="mb-1"></button>
                    </td>
                </tr>
            </ng-template>
        </p-table>
    </div>`,
    providers: [ProductService]
})
export class SalesTableWidget {
    products = signal<Product[]>([]);

    constructor(public productService: ProductService) {
        this.productService.getProducts().then((data: any) => {
            this.products.set(data);
        });
    }
}
