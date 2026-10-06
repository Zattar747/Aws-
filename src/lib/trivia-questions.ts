export type TriviaDifficulty = "easy" | "medium" | "hard";

export interface TriviaQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: TriviaDifficulty;
}

/**
 * PLACEHOLDER bank — swap this out once the club sends tomorrow's actual
 * orientation content. Keep each question's `difficulty` honest (it drives
 * the points formula in lib/points.ts) and mix levels — a 10-question quiz
 * picks QUIZ_MIX from this pool.
 */
export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    question: "What does 'AWS' stand for?",
    options: ["Amazon Web Services", "Advanced Website Systems", "Automated Web Servers", "Amazon Wireless Storage"],
    correctIndex: 0,
    explanation: "AWS is short for Amazon Web Services, Amazon's cloud computing platform.",
    difficulty: "easy",
  },
  {
    question: "Which company owns AWS?",
    options: ["Google", "Microsoft", "Amazon", "Apple"],
    correctIndex: 2,
    explanation: "AWS is a subsidiary of Amazon.",
    difficulty: "easy",
  },
  {
    question: "In simple terms, what is 'the cloud'?",
    options: ["Literal weather clouds", "Remote servers accessed over the internet", "A type of computer virus", "A folder on your desktop"],
    correctIndex: 1,
    explanation: "'The cloud' just means computers and storage owned by someone else that you access over the internet.",
    difficulty: "easy",
  },
  {
    question: "What is the name of AWS's main storage service for files like images and videos?",
    options: ["S3", "EC2", "RDS", "IAM"],
    correctIndex: 0,
    explanation: "Amazon S3 (Simple Storage Service) is AWS's core service for storing files.",
    difficulty: "easy",
  },
  {
    question: "What does AWS offer to let students try services for free for a limited time?",
    options: ["AWS Premium", "AWS Free Tier", "AWS Student Pass", "AWS Trial Club"],
    correctIndex: 1,
    explanation: "AWS Free Tier lets new users try many services for free within certain limits.",
    difficulty: "easy",
  },
  {
    question: "Roughly what year did AWS launch?",
    options: ["1999", "2006", "2015", "2020"],
    correctIndex: 1,
    explanation: "AWS publicly launched in 2006.",
    difficulty: "easy",
  },
  {
    question: "What does the 'S3' in Amazon S3 stand for?",
    options: ["Simple Storage Service", "Super Secure Storage", "Server Storage System", "Storage Speed Service"],
    correctIndex: 0,
    explanation: "S3 stands for Simple Storage Service.",
    difficulty: "medium",
  },
  {
    question: "What is an 'AWS Region'?",
    options: ["A single computer", "A physical location where AWS has data centers", "A type of AWS employee", "A pricing plan"],
    correctIndex: 1,
    explanation: "An AWS Region is a physical geographic area where AWS operates data centers.",
    difficulty: "medium",
  },
  {
    question: "What is IAM mainly used for?",
    options: ["Storing videos", "Controlling who can access your AWS account and what they can do", "Sending emails", "Designing websites"],
    correctIndex: 1,
    explanation: "IAM (Identity and Access Management) controls access and permissions.",
    difficulty: "medium",
  },
  {
    question: "What does 'serverless computing' mean?",
    options: ["No computers are involved at all", "Running code without managing a server yourself", "A computer that never turns on", "Free computing forever"],
    correctIndex: 1,
    explanation: "Serverless means AWS manages the server for you — your code just runs.",
    difficulty: "medium",
  },
  {
    question: "What is AWS Lambda mainly used for?",
    options: ["Storing large files", "Running small pieces of code automatically, without managing a server", "Managing domain names", "Video editing"],
    correctIndex: 1,
    explanation: "AWS Lambda runs code automatically in response to events, serverless.",
    difficulty: "medium",
  },
  {
    question: "What does a CDN (Content Delivery Network) do?",
    options: ["Stores your passwords", "Speeds up delivery of content by serving it from servers closer to the user", "Blocks viruses", "Creates websites automatically"],
    correctIndex: 1,
    explanation: "A CDN caches content on servers near the user to reduce load time.",
    difficulty: "medium",
  },
  {
    question: "What does 'VPC' stand for?",
    options: ["Virtual Private Cloud", "Very Personal Computer", "Verified Public Connection", "Virtual Public Center"],
    correctIndex: 0,
    explanation: "VPC stands for Virtual Private Cloud, an isolated network you control within AWS.",
    difficulty: "hard",
  },
  {
    question: "What is an 'Availability Zone'?",
    options: ["A weather forecast zone", "An isolated data center location within an AWS Region", "A type of discount code", "A social media hashtag"],
    correctIndex: 1,
    explanation: "An Availability Zone is an isolated data center location within a Region, used for redundancy.",
    difficulty: "hard",
  },
  {
    question: "What does 'auto-scaling' allow a system to do?",
    options: ["Automatically delete old files", "Automatically add or remove computing resources based on demand", "Automatically translate languages", "Automatically create backups every second"],
    correctIndex: 1,
    explanation: "Auto-scaling adjusts resources to match real-time demand.",
    difficulty: "hard",
  },
  {
    question: "What is a 'load balancer' used for?",
    options: ["Balancing a computer on a desk", "Spreading incoming traffic across multiple servers so none gets overloaded", "Charging your laptop faster", "Compressing files"],
    correctIndex: 1,
    explanation: "A load balancer distributes traffic across servers to avoid overload.",
    difficulty: "hard",
  },
  {
    question: "What does 'IaaS' stand for?",
    options: ["Infrastructure as a Service", "Internet as a Subscription", "Information and Storage Service", "Instant Access as a System"],
    correctIndex: 0,
    explanation: "IaaS stands for Infrastructure as a Service.",
    difficulty: "hard",
  },
];

// How many questions of each difficulty a single quiz draws — must not
// exceed the number available in TRIVIA_QUESTIONS at that difficulty.
export const QUIZ_MIX: Record<TriviaDifficulty, number> = {
  easy: 4,
  medium: 4,
  hard: 2,
};

export const QUESTION_DURATION_MS = 10000;
