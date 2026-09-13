export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

/**
 * PLACEHOLDER quiz — swap this out once the club sends real questions.
 * Written for players who know nothing about AWS: each question has one
 * obviously-correct answer and three clearly-silly distractors.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "What does 'AWS' stand for?",
    options: ["Amazon Web Services", "Amazon Wide Storage", "Advanced Web Systems", "Amazon Work Servers"],
    correctIndex: 0,
  },
  {
    question: "AWS is a cloud platform made by which company?",
    options: ["Amazon", "Google", "Microsoft", "Apple"],
    correctIndex: 0,
  },
  {
    question: "In simple terms, what is 'the cloud'?",
    options: ["Computers and storage you access over the internet", "A literal cloud in the sky", "A type of computer virus", "A brand of laptop"],
    correctIndex: 0,
  },
  {
    question: "Which AWS service works like a giant online hard drive for storing files?",
    options: ["S3 (Simple Storage Service)", "Microsoft Word", "Bluetooth", "A USB drive"],
    correctIndex: 0,
  },
  {
    question: "Renting computers over the internet instead of buying your own is called...?",
    options: ["Cloud computing", "Cable computing", "Desktop computing", "Offline computing"],
    correctIndex: 0,
  },
  {
    question: "Which of these is NOT a real AWS service?",
    options: ["CloudBanana", "EC2", "Lambda", "DynamoDB"],
    correctIndex: 0,
  },
  {
    question: "What color is the AWS logo best known for?",
    options: ["Orange", "Purple", "Pink", "Teal"],
    correctIndex: 0,
  },
  {
    question: "When a website suddenly gets way more visitors, AWS can automatically add more servers. This is called...?",
    options: ["Auto Scaling", "Auto Shrinking", "Server Panic Mode", "Manual Boosting"],
    correctIndex: 0,
  },
  {
    question: "AWS has data centers grouped into areas around the world called...?",
    options: ["Regions", "Neighborhoods", "Zones of Doom", "Countries Only"],
    correctIndex: 0,
  },
  {
    question: "Roughly when was AWS first launched?",
    options: ["2006", "1995", "2015", "1980"],
    correctIndex: 0,
  },
];

export const QUESTION_DURATION_MS = 15000;
