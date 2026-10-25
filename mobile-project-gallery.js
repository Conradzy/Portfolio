import { mobileProjects } from './mobile-projects.js';
import { createProjectGallery } from './project-gallery.js';

createProjectGallery({
  galleryId:'cz-mobile-gallery',
  trigger:document.getElementById('cz-phone-stage'),
  openButton:document.querySelector('.cz-mobile-gallery-open'),
  projects:mobileProjects, label:'Mobile development', heading:'Made for life on the go.', device:'phone',
  loadRenderer:options => import('./mobile-project-phones.js').then(({createProjectPhones}) => createProjectPhones(options)),
  credit:'iPhone 12 Pro by <a href="https://sketchfab.com/3d-models/iphone-12-pro-05dfc991665e45c68c8b7062136c0c6e" target="_blank" rel="noopener noreferrer">DatSketch</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · Screens adapted'
});
