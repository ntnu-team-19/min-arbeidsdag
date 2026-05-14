import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ListboxModule } from 'primeng/listbox';
import { RouterModule, Router } from '@angular/router';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';

interface MenuItem {
  label: string;
  icon: string;
  action: string;
}

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, ButtonModule, DrawerModule, ListboxModule, RouterModule, TranslatePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  menuOpen = false;
  darkMode = false;
  language = 'no';

  private router = inject(Router);
  private translate = inject(TranslateService);
  private themeService = inject(ThemeService);

  get currentLang() {
    return this.translate.currentLang ?? this.translate.defaultLang;
  }

  /** Dynamic menu items that react to current language and dark mode state */
  get menuItems(): MenuItem[] {
    return [
      {
        label: 'navbar.user',
        icon: 'pi pi-user',
        action: 'user',
      },
      // {
      //   label: 'navbar.statistics',
      //   icon: 'pi pi-chart-bar',
      //   action: 'statistics',
      // },
      {
        label: 'navbar.language',
        icon: 'pi pi-language',
        action: 'language',
      },
      {
        label: this.themeService.isDark() ? 'navbar.lightMode' : 'navbar.darkMode',
        icon: this.themeService.isDark() ? 'pi pi-sun' : 'pi pi-moon',
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
    this.themeService.toggleTheme();
  }

  toggleLanguage() {
    const next = this.currentLang === 'no' ? 'en' : 'no';
    this.translate.use(next);
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
