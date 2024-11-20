import { createContext } from 'react';
import type { Navbar } from './navbarHooks';
import './navbarHooks';

export const NavbarContext = createContext<Navbar | null>(null);
