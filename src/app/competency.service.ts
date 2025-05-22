import { Injectable } from '@angular/core';

export interface Competency {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  detailsImageUrl: string;
  videos: string[];
}

export interface Domain {
  name: string;
  competencies: Competency[];
}

@Injectable({
  providedIn: 'root'
})
export class CompetencyService {

  private domains: Domain[] = [
      {
        "name": "Cognitive Development",
        "competencies": [
          {
            "id": "classification",
            "name": "Classification",
            "imageUrl": "assets/images/competencies/classification.png",
            "description": "Classification is an important concept related to identifying different characteristics of things and categorizing them according to these characteristics. Children develop these skills by observing and examining different aspects of objects and identifying how these are alike or different.",
            "detailsImageUrl": "assets/images/details/classification.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "patterns",
            "name": "Patterns",
            "imageUrl": "assets/images/competencies/patterns.png",
            "description": "Understanding patterns is a foundational math skill upon which many mathematical concepts are based. For example, multiplication and counting both require an understanding of patterns. Patterns help children make logical connections between things, events, etc., by using their reasoning and problem-solving skills. Patterns can be found everywhere in our lives (e.g., the daily routine that we follow).",
            "detailsImageUrl": "assets/images/details/patterns.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "number-concept",
            "name": "Number concept",
            "imageUrl": "assets/images/competencies/number concept.png",
            "description": "Learning number concepts is one of the most important competencies and sets the foundation for understanding numbers. Number concepts involve a child's ability to recognize numerals, one-to-one correspondence, counting and simple operations",
            "detailsImageUrl": "assets/images/details/number concept.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "seriation",
            "name": "Seriation",
            "imageUrl": "assets/images/competencies/seriation.png",
            "description": "Seriation is an important concept related to measuring objects and categorizing them accordingly. At preschool age, children develop these skills for sequencing and putting objects in order, such as from smallest to largest, lightest to heaviest or least to most.",
            "detailsImageUrl": "assets/images/details/seriation.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          }
        ]
      },
      {
        "name": "Language and Literacy Development",
        "competencies": [
          {
            "id": "vocabulary-and-expression",
            "name": "Vocabulary and expression",
            "imageUrl": "assets/images/competencies/vocab&exp.png",
            "description": "Early vocabulary development is an important predictor of success in reading. A strong vocabulary enables a child to understand and communicate more effectively",
            "detailsImageUrl": "assets/images/details/vocab&exp.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "listening-comprehension",
            "name": "Listening comprehension",
            "imageUrl": "assets/images/competencies/listen&comp.png",
            "description": "Listening comprehension is important for a child to understand what is being said. It includes a child's receptive language skills as well as interpretation of what he/she hears.",
            "detailsImageUrl": "assets/images/details/listening.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "emergent-reading-book-handling",
            "name": "Emergent reading - book handling",
            "imageUrl": "assets/images/competencies/emergent reading.png",
            "description": "Book handling is a predictor of successful reading skills. It helps children to develop bonds with books, understand books, letters, words, and directionality, and to understand that print has meaning.",
            "detailsImageUrl": "assets/images/details/emergent reading.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "emergent-writing",
            "name": "Emergent writing",
            "imageUrl": "assets/images/competencies/emergent writing.png",
            "description": "Writing is an important skill. Between the ages of 3 to 6 years, children begin to learn to write, and by the time they are 6 years old, they should be able to write some simple words and/or their names.",
            "detailsImageUrl": "assets/images/details/emergent writing.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          }
        ]
      },
      {
        "name": "Physical and Motor Development",
        "competencies": [
          {
            "id": "gross-motor-development",
            "name": "Gross motor development",
            "imageUrl": "assets/images/competencies/gross motor.png",
            "description": "Gross motor development involves large muscle movements in arms, legs and the torso, and includes skills, such as walking, running, climbing, throwing, kicking, and catching. A child needs considerable practice to develop gross motor skills.",
            "detailsImageUrl": "assets/images/details/gross motor.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "fine-motor-development",
            "name": "Fine motor development",
            "imageUrl": "assets/images/competencies/fine-motor-development.png",
            "description": "Fine motor development includes the development of small finger muscles and skills such as picking up things, threading beads, tying shoelaces, colouring within the boundary and stacking objects of different sizes.",
            "detailsImageUrl": "assets/images/details/fine motor.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          }
        ]
      },
      {
        "name": "Socio-Emotional Development",
        "competencies": [
          {
            "id": "interaction",
            "name": "Interaction",
            "imageUrl": "assets/images/competencies/interaction.png",
            "description": "Interaction between young children and their peers and adults is important during the early years. Through interactions, children learn a language and social skills. Children who are given enough opportunities to interact and communicate through play-based activities tend to have a stronger social relationship with others.",
            "detailsImageUrl": "assets/images/details/interaction.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "sharing-with-others",
            "name": "Sharing with others",
            "imageUrl": "assets/images/competencies/sharing-with-others.png",
            "description": "Sharing is an important social skill. Children at an early age build these skills through observation",
            "detailsImageUrl": "assets/images/details/sharing with others.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "emotional-expression-and-regulation",
            "name": "Emotional expression and regulation",
            "imageUrl": "assets/images/competencies/emotional exp.png",
            "description": "Emotional regulation determines a child's ability to express feelings and manage her/his emotions. Emotional regulation is a crucial skill for the well-being of the child. It is important that parents, caregivers and teachers provide support for the child's emotional stability to help her/him grow and develop optimally",
            "detailsImageUrl": "assets/images/details/emotional exp.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          }
        ]
      },
      {
        "name": "Approaches towards Learning",
        "competencies": [
          {
            "id": "initiative",
            "name": "Initiative",
            "imageUrl": "assets/images/competencies/initiative.png",
            "description": "Learning to take initiative is a behaviour that helps children navigate their lives with confidence. By taking initiative, children become more proactive and look for different ways to grow, study, excel and practice leadership skills.",
            "detailsImageUrl": "assets/images/details/initiative.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "task-persistence",
            "name": "Task persistence",
            "imageUrl": "assets/images/competencies/task persistence.png",
            "description": "Task persistence is a skill that is important for children in classroom activities as well as in personal endeavours. It is important that children are encouraged to undertake challenging activities and tasks. This will help them learn to persevere, complete tasks and activities, and not give up.",
            "detailsImageUrl": "assets/images/details/task persistence.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          }
        ]
      },
      {
        "name": "Creativity Development",
        "competencies": [
          {
            "id": "creative-expression",
            "name": "Creative expression",
            "imageUrl": "assets/images/competencies/creative expression.png",
            "description": "One of the best ways for children to learn about new concepts is to ignite their interest through hands- on experience. Besides giving young children the chance to explore different concepts through their senses, the experience helps develop other useful skills, including problem-solving and perseverance.",
            "detailsImageUrl": "assets/images/details/creative exp.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          },
          {
            "id": "imagination",
            "name": "Imagination",
            "imageUrl": "assets/images/competencies/imagination.png",
            "description": "Imagination is the door to possibilities. It is where creativity and thinking outside the box begin in child development. Imaginative and creative play is how children learn about the world. During imaginative play, children manipulate materials, express themselves verbally and non-verbally, plan (intentionally or unintentionally), act, interact, react, and try different roles",
            "detailsImageUrl": "assets/images/details/imagination.png",
            "videos": [
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4",
              "assets/videos/option1.mp4"
            ]
          }
        ]
      }
    ];

  constructor() { }

  getDomains(): Domain[] {
    return this.domains;
  }

  getCompetencyById(id: string): Competency | undefined {
    for (const domain of this.domains) {
      const foundCompetency = domain.competencies.find(c => c.id === id);
      if (foundCompetency) {
        return foundCompetency;
      }
    }
    return undefined;
  }
}
