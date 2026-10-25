import { webProjects } from './web-projects.js';
import { createProjectGallery } from './project-gallery.js';

createProjectGallery({
  galleryId:'cz-web-gallery',
  trigger:document.getElementById('cz-laptop-stage'),
  openButton:document.querySelector('.cz-web-gallery-open'),
  projects:webProjects, label:'Web development', heading:'Ideas, brought to life.', device:'laptop',
  loadRenderer:options => import('./web-project-laptops.js').then(({createProjectLaptops}) => createProjectLaptops(options))
});
