import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ListboxModule } from 'primeng/listbox';

interface MenuItem {
  label: string;
  icon: string;
  action: string;
}

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, ButtonModule, DrawerModule, ListboxModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  menuOpen = false;
  darkMode = false;
  language = 'no';

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

  onMenuSelect(event: any) {
    const item: MenuItem = event.value;
    if (!item) return;

    switch (item.action) {
      case 'darkmode':
        this.toggleDarkMode();
        break;
      case 'language':
        this.toggleLanguage();
        break;
      case 'statistics':
        // Naviger til statistikk
        this.menuOpen = false;
        break;
      case 'user':
        // Naviger til brukerprofil
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

  onNotifications() {
    // Håndter varsler
  }
}
