import { mount } from 'svelte';
import '@fontsource-variable/golos-text';
import App from './App.svelte';
import './style.css';

mount(App, { target: document.getElementById('app') });
