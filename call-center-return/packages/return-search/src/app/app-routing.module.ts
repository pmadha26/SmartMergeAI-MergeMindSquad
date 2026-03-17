/*
 * IBM Confidential
 * OCO Source Materials
 * 5737-D18, 5725-D10
 *
 * (C) Copyright International Business Machines Corp. 2022, 2023
 *
 * The source code for this program is not published or otherwise divested
 * of its trade secrets, irrespective of what has been deposited with the
 * U.S. Copyright Office.
 */

import { APP_BASE_HREF } from '@angular/common';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BucCommonClassesEmptyRouteGaurd, BucCommonEmptyRouteComponent, routePath } from '@buc/svc-angular';

const routes: Routes = [
  {
    path: routePath('return-search/return'),
    loadChildren: () => import('./features/return/return.module').then(m => m.ReturnModule)
  },
  {
    path: routePath('return-search'),
    pathMatch: 'full',
    redirectTo: routePath('return-search/return')
  },
  {
    path: '**',
    canActivate: [BucCommonClassesEmptyRouteGaurd],
    component: BucCommonEmptyRouteComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [{ provide: APP_BASE_HREF, useValue: '/' }]
})
export class AppRoutingModule { }
