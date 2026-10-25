const photo = (file, alt) => ({ src: `assets/awards/${file}`, alt });

export const awards = [
  {
    id: 'it-olympiad', title: 'IT Olympiad 2026', subtitle: 'Data Mining',
    institution: 'Ateneo de Davao University', result: '3rd place',
    description: 'Our team earned third place in Data Mining at IT Olympiad 2026, held at Ateneo de Davao University. This achievement reflects our collaborative approach to applying data analysis and technical skills in a competitive setting.',
    photos: [
      photo('datamining1.jpg', 'IT Olympiad team with their Data Mining certificates'),
      photo('datamining2.jpg', 'Team members celebrating third place in Data Mining'),
      photo('datamining3.jpg', 'Team selfie with IT Olympiad medals and certificates'),
      photo('dataminingcert.png', 'Raymond Conrad S. Napiñas — IT Olympiad 2026 Data Mining certificate of recognition')
    ]
  },
  {
    id: 'level-app', title: 'Level-App', subtitle: 'Inter-School Competition · DropPoint',
    institution: 'Startup showcase & competition', result: '2nd · Promotional Video / 6th · Overall / 10th · Poster Design',
    description: 'Our DropPoint startup earned second place in Promotional Video, sixth place overall, and tenth place in Poster Design at the Level-App Inter-School Competition. The experience brought together product development, video editing, visual communication, and teamwork to present our vision for a more connected water refilling service.',
    photos: [
      photo('droppoint1.jpg', 'DropPoint participation, pitching, and second-place Promotional Video certificates'),
      photo('droppoint2.jpg', 'DropPoint team at their startup exhibition booth'),
      photo('droppoint3.jpg', 'DropPoint team receiving recognition on stage'),
      photo('droppoint4.jpg', 'Team presenting the DropPoint startup'),
      photo('droppoint5.jpg', 'DropPoint exhibition booth with the team and product displays'),
      photo('droppoint6.jpg', 'DropPoint team at the Level App 3.0 awarding ceremony')
    ]
  },
  {
    id: 'deans-list', title: 'Dean’s List', subtitle: 'Consistent First Honors',
    institution: 'Davao del Norte State College', result: '1st year — 3rd year, second semester',
    description: 'I consistently earned First Honors on the Dean’s List at Davao del Norte State College from my first year through the second semester of my third year. This recognition reflects my commitment to academic excellence, disciplined learning, and steady growth throughout my Information Technology studies.',
    photos: [
      photo('deanslist.jpg', 'Students celebrating academic recognition with their honors certificates at Davao del Norte State College'),
      photo('deanslist2.jpg', 'Students on stage during the academic honors recognition ceremony at Davao del Norte State College')
    ]
  }
];
