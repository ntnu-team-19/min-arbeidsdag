import { Component, HostBinding, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ListboxModule } from 'primeng/listbox';
import { RouterModule, Router } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  action: string;
}

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, ButtonModule, DrawerModule, ListboxModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  menuOpen = false;
  darkMode = false;
  language = 'no';

  private router = inject(Router);

  // Toggles 'navbar-hidden' class on host element to hide/show navbar
  @HostBinding('class.navbar-hidden')
  isHidden = false;

  private lastScrollY = 0;
  private scrollThreshold = 10;

  @HostListener('window:scroll')
  onScroll() {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - this.lastScrollY;
    if (Math.abs(delta) < this.scrollThreshold) return;
    this.isHidden = delta > 0 && currentScrollY > 64;
    this.lastScrollY = currentScrollY;
  }

  /** Dynamic menu items that react to current language and dark mode state */
  get menuItems(): MenuItem[] {
    return [
      {
        label: 'User',
        icon: 'pi pi-user',
        action: 'user',
      },
      {
        label: 'Statistikk',
        icon: 'pi pi-chart-bar',
        action: 'statistics',
      },
      {
        label: this.language === 'no' ? 'English' : 'Norsk',
        icon: 'pi pi-language',
        action: 'language',
      },
      {
        label: this.darkMode ? 'Lys modus' : 'Mørk modus',
        icon: this.darkMode ? 'pi pi-sun' : 'pi pi-moon',
        action: 'darkmode',
      },
    ];
  }

  /** Handles sidebar menu item selection and triggers the corresponding action */
  onMenuSelect(event: { value: MenuItem | null }) {
    const item = event.value;
    if (!item) return;

    switch (item.action) {
      case 'darkmode':
        this.toggleDarkMode();
        break;
      case 'language':
        this.toggleLanguage();
        break;
      case 'statistics':
        this.menuOpen = false;
        break;
      case 'user':
        this.menuOpen = false;
        break;
    }
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    document.documentElement.classList.toggle('dark', this.darkMode);
  }

  toggleLanguage() {
    this.language = this.language === 'no' ? 'en' : 'no';
  }

  goToHome() {
    this.router.navigate(['/'], {
      queryParams: {
        day: 'today',
        view: 'list',
      },
    });
  }
}
