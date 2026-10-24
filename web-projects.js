// Project copy, repository destinations, and laptop screen images.
export const webProjects = [
  {
    id: 'firetrackr', title: 'FireTrackr', category: 'Emergency operations', role: 'Collaborator',
    description: 'A fire operations system with specialized route planning for the Bureau of Fire Protection in Panabo City. I contributed as a collaborator to support more efficient emergency response coordination.',
    repository: 'https://github.com/kobedumandan/firetrackr',
    image: 'assets/web-projects/firetrackr.png',
    // Exclude the browser toolbar and taskbar from the supplied screenshot.
    crop: [0, 122 / 1080, 1, 910 / 1080]
  },
  {
    id: 'anitime', title: 'AniTime', category: 'Agricultural marketplace',
    description: 'A digital marketplace connecting farmers and buyers across Mindanao, making it easier to buy and sell crops through one accessible platform.',
    repository: 'https://github.com/Conradzy/Anitime',
    image: 'assets/web-projects/anitime.png'
  },
  {
    id: 'droppoint', title: 'DropPoint', category: 'Business management',
    description: 'An all-in-one management platform for water refilling stations, bringing together delivery routing, gallon tracking, and statistical insights to support day-to-day operations and business growth.',
    repository: 'https://github.com/Conradzy/DropPoint',
    image: 'assets/web-projects/droppoint.png'
  },
  {
    id: 'novastrum', title: 'Novastrum', category: 'Landing page design',
    description: 'A landing page design concept showcasing Apple products through refined typography, thoughtful composition, and a visually focused browsing experience.',
    repository: 'https://github.com/Conradzy/cellphone',
    image: 'assets/web-projects/novastrum.png',
    crop: [0, 122 / 1080, 1905 / 1920, 910 / 1080]
  },
  {
    id: 'wastewise', title: 'WasteWise', category: 'Community waste management',
    description: 'A web application for organized waste collection, with pickup scheduling and tools for residents, collectors, and administrators. It promotes responsible disposal and better waste segregation in the community.',
    repository: 'https://github.com/Conradzy/laravel-project-wastewise',
    image: 'assets/web-projects/wastewise.png'
  }
];
