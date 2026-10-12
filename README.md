# Data For Dummies

Live site: [https://datafordummies.in](https://datafordummies.in)

Repository: [https://github.com/fkhambaty/datafordummies](https://github.com/fkhambaty/datafordummies)

Another computer or another AI should read [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`AGENTS.md`](AGENTS.md) before editing. The older notes below still say FKTI and `fkti_data`. Those names are historical. The live brand is Data For Dummies, and the site is served by GitHub Pages from this repository.

# FKTI Learning Hub (historical notes)

## Overview

The FKTI Learning Hub is a comprehensive, university-level learning platform that provides interactive courses in Data Science and Data Engineering. This unified platform serves as the central entry point for multiple specialized courses, featuring modern web technologies and pedagogical excellence.

## 🏗️ Platform Architecture

```
FKTI_Learning_Hub/
├── index.html                 # Central hub homepage
├── css/
│   └── hub-styles.css        # Main hub styling
├── js/
│   └── hub-script.js         # Hub navigation & functionality
├── assets/
│   └── logo.svg              # Shared FKTI logo
├── python_course/            # Complete Python for Data Science course
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── quiz-data.js
│   └── logo.svg
├── airflow_course/           # Complete Apache Airflow mastery course
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── quiz-data.js
│   ├── logo.svg
│   ├── README.md
│   ├── UNIVERSITY_GUIDE.md
│   └── SCREENSHOT_GUIDE.md
└── README.md                 # This file
```

## 🚀 Features

### Central Hub
- **Modern Landing Page**: Professional design with course overview
- **Course Navigation**: Easy access to both Python and Airflow courses
- **Progress Tracking**: Unified progress monitoring across courses
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Course Recommendations**: Guided learning path suggestions

### Cross-Platform Integration
- **Seamless Navigation**: Jump between courses without losing progress
- **Unified Branding**: Consistent FKTI visual identity
- **Progress Persistence**: LocalStorage-based progress tracking
- **Hub Return**: Easy navigation back to the central hub

### Course Features
- **Interactive Learning**: Hands-on exercises and quizzes
- **University-Level Content**: Academic rigor with practical applications
- **Real-World Examples**: Industry-relevant projects and case studies
- **Progress Visualization**: Visual feedback on learning progress
- **Certification System**: Completion certificates for each course

## 📚 Available Courses

### 1. Python for Data Science 🐍
- **Duration**: 12-Week Timeline
- **Level**: Beginner to Advanced
- **Content**: 25+ Interactive Lessons
- **Focus**: Python fundamentals, NumPy, Pandas, Matplotlib, ML basics
- **Certification**: FKTI Python Data Science Certificate

**Learning Path:**
- Python fundamentals and syntax
- Data structures and algorithms
- NumPy for numerical computing
- Pandas for data analysis
- Matplotlib for visualization
- Machine learning introduction

### 2. Apache Airflow Mastery 🌊
- **Duration**: 15-Week Semester
- **Level**: University Level (Advanced)
- **Content**: 30+ Comprehensive Lessons
- **Focus**: Workflow orchestration, DAG design, production deployment
- **Certification**: FKTI Airflow Expert Certificate

**Learning Path:**
- Workflow management theory
- DAG (Directed Acyclic Graph) design
- Operators, sensors, and hooks
- Advanced scheduling patterns
- Production deployment strategies
- Monitoring and optimization

## 🎯 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Basic understanding of programming concepts (for Airflow course)
- No installation required - fully web-based platform

### Quick Start Guide

1. **Open the Hub**: Navigate to `index.html` in your browser
2. **Choose Your Path**: Select either Python or Airflow course
3. **Start Learning**: Follow the interactive lessons
4. **Track Progress**: Monitor your advancement through each section
5. **Switch Courses**: Use navigation to move between courses anytime

### Keyboard Shortcuts
- **P**: Quick access to Python course
- **A**: Quick access to Airflow course  
- **Escape**: Return to top of current page

## 🔧 Technical Implementation

### Frontend Technologies
- **HTML5**: Semantic, accessible markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: No framework dependencies
- **Highlight.js**: Syntax highlighting for code examples
- **Font Awesome**: Professional iconography
- **Google Fonts**: Typography (Inter, JetBrains Mono)

### Key Features Implementation
- **Responsive Design**: Mobile-first CSS Grid layouts
- **Progress Tracking**: LocalStorage API for persistence
- **Smooth Navigation**: CSS transitions and JavaScript animations
- **Cross-Course Integration**: Unified navigation system
- **Interactive Elements**: Dynamic quizzes and exercises

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📱 Responsive Design

The platform is fully responsive with breakpoints for:
- **Desktop**: 1200px+ (Full layout)
- **Tablet**: 768px-1199px (Adapted layout)
- **Mobile**: <768px (Stacked layout)

## 📊 Progress Tracking System

### Hub-Level Tracking
```javascript
// Progress data structure
{
  completedSections: 15,
  totalSections: 25,
  percentage: 60,
  timestamp: "2025-11-29T..."
}
```

### Course-Level Tracking
- Individual checkbox completion states
- Section-by-section progress
- Course completion certificates
- Learning achievement badges

## 🎨 Design System

### Color Palette
- **Primary Blue**: #0077be (Trust, professionalism)
- **Primary Purple**: #667eea (Innovation, creativity)
- **Accent Green**: #4caf50 (Success, progress)
- **Accent Orange**: #ff9800 (Energy, attention)

### Typography
- **Primary**: Inter (Clean, readable)
- **Code**: JetBrains Mono (Developer-focused)
- **Hierarchy**: Clear size and weight distinctions

### Visual Elements
- **Gradients**: Modern depth and dimension
- **Shadows**: Subtle elevation cues
- **Animations**: Smooth, purposeful motion
- **Icons**: Consistent Font Awesome set

## 🔄 Navigation System

### Hub Navigation
- Course selection cards
- Feature highlights
- About and contact sections
- Call-to-action buttons

### Course Navigation
- **Hub Return**: ← FKTI Hub (left)
- **Main Navigation**: Course sections (center)  
- **Course Switch**: Switch to other course (right)

### URL Structure
```
/                          # Hub homepage
/python_course/           # Python course
/airflow_course/          # Airflow course
```

## 🏆 Certification System

### Python Course Certificate
- Completion requirement: 100% of exercises
- Skills validated: Python, Data Analysis, Visualization
- Format: Digital certificate with verification

### Airflow Course Certificate  
- Completion requirement: 100% of exercises + final project
- Skills validated: Workflow Orchestration, Production Systems
- Format: Digital certificate with industry recognition

## 🤝 Contributing

This is an educational platform developed by FKTI. For suggestions or improvements:
1. Review the course content and structure
2. Identify areas for enhancement
3. Submit feedback through official FKTI channels

## 📞 Support

### Contact Information
- **Email**: support@fkti.edu
- **Website**: www.fkti.edu
- **Access**: 24/7 Online Platform

### Learning Support
- Interactive help within each course
- Progress tracking and analytics
- Comprehensive documentation
- Community learning resources

## 📄 License

© 2025 FKTI - Fakhruddin Khambaty Training Institute. All rights reserved.

This educational platform is designed for learning purposes and maintains high academic standards while providing practical, industry-relevant training.

## 🔮 Future Enhancements

### Planned Features
- **Advanced Analytics**: Detailed learning insights
- **Social Learning**: Collaborative features
- **Mobile App**: Native iOS/Android applications
- **Advanced Courses**: Machine Learning, Cloud Engineering
- **Integration**: LMS and university system compatibility

### Technology Roadmap
- Progressive Web App (PWA) capabilities
- Offline learning support
- Advanced assessment systems
- Real-time collaboration tools

---

**Built with ❤️ by FKTI - Empowering the next generation of data professionals**
