export type TriviaLevel = "easy" | "medium" | "hard";
export type TriviaIcon = "s3" | "ec2" | "lambda" | "rds" | "route53";

export interface TriviaQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  icon?: TriviaIcon;
}

/**
 * AWS Club Trivia — from wordlist_n_trivia/aws_club_quiz_MCQ.pdf (35
 * questions, answer key included there). Icon-round questions show a
 * service icon alongside the text.
 */
export const TRIVIA_QUESTIONS: Record<TriviaLevel, TriviaQuestion[]> = {
  easy: [
    {
      question: "What does 'AWS' stand for?",
      options: ["Amazon Web Services", "Advanced Website Systems", "Automated Web Servers", "Amazon Wireless Storage"],
      correctIndex: 0,
      explanation: "AWS is short for Amazon Web Services, Amazon's cloud computing platform.",
    },
    {
      question: "Which company owns AWS?",
      options: ["Google", "Microsoft", "Amazon", "Apple"],
      correctIndex: 2,
      explanation: "AWS is a subsidiary of Amazon, launched to sell its internal infrastructure as a service.",
    },
    {
      question: "In simple terms, what is 'the cloud'?",
      options: ["Literal weather clouds", "Remote servers/computers accessed over the internet", "A type of computer virus", "A folder on your desktop"],
      correctIndex: 1,
      explanation: "'The cloud' just means computers and storage owned by someone else that you access over the internet.",
    },
    {
      question: "Which of these best describes cloud computing?",
      options: ["Storing files only on your own laptop", "Renting computing power and storage over the internet instead of buying your own hardware", "A social media platform", "A programming language"],
      correctIndex: 1,
      explanation: "Cloud computing means renting computing power and storage instead of buying and maintaining your own servers.",
    },
    {
      question: "What is the name of AWS's main storage service, used to store files like images and videos?",
      options: ["S3", "EC2", "RDS", "IAM"],
      correctIndex: 0,
      explanation: "Amazon S3 (Simple Storage Service) is AWS's core service for storing files like images and videos.",
    },
    {
      question: "This service's icon is an orange bucket that stores files and objects in the cloud. Which service is it?",
      options: ["Amazon EC2", "Amazon S3", "AWS Lambda", "Amazon RDS"],
      correctIndex: 1,
      explanation: "The orange bucket icon represents Amazon S3, since S3 organizes storage into \"buckets.\"",
      icon: "s3",
    },
    {
      question: "What is the name of AWS's service that lets you rent a virtual computer/server?",
      options: ["S3", "EC2", "Lambda", "Route 53"],
      correctIndex: 1,
      explanation: "Amazon EC2 (Elastic Compute Cloud) lets you rent virtual servers in the cloud.",
    },
    {
      question: "This service's icon looks like a small server/computer that lets you rent a virtual machine in the cloud. Which service is it?",
      options: ["Amazon EC2", "AWS Lambda", "Amazon CloudFront", "Amazon RDS"],
      correctIndex: 0,
      explanation: "The small server icon represents Amazon EC2, AWS's virtual server service.",
      icon: "ec2",
    },
    {
      question: "What does AWS offer to let students/new users try services for free for a limited time?",
      options: ["AWS Premium", "AWS Free Tier", "AWS Student Pass", "AWS Trial Club"],
      correctIndex: 1,
      explanation: "AWS Free Tier lets new users try many AWS services for free within certain limits.",
    },
    {
      question: "What does 'EC2' stand for?",
      options: ["Elastic Cloud Computer", "Elastic Compute Cloud", "Extra Cloud Capacity", "Easy Cloud Connect"],
      correctIndex: 1,
      explanation: "EC2 stands for Elastic Compute Cloud. It's called \"elastic\" because you can scale it up or down.",
    },
    {
      question: "What is the basic purpose of a cloud platform like AWS?",
      options: ["To sell physical computers", "To provide computing power, storage, and services over the internet on demand", "To design logos", "To host only video games"],
      correctIndex: 1,
      explanation: "AWS exists to provide computing power, storage, and other services over the internet, on demand.",
    },
    {
      question: "Roughly what year did AWS launch?",
      options: ["1999", "2006", "2015", "2020"],
      correctIndex: 1,
      explanation: "AWS publicly launched in 2006, starting with services like S3 and EC2.",
    },
  ],
  medium: [
    {
      question: "What does the 'S3' in Amazon S3 stand for?",
      options: ["Simple Storage Service", "Super Secure Storage", "Server Storage System", "Storage Speed Service"],
      correctIndex: 0,
      explanation: "S3 stands for Simple Storage Service. AWS designed it to be simple to use at massive scale.",
    },
    {
      question: "What is an 'AWS Region'?",
      options: ["A single computer", "A physical location where AWS has data centers", "A type of AWS employee", "A pricing plan"],
      correctIndex: 1,
      explanation: "An AWS Region is a physical geographic area where AWS operates data centers.",
    },
    {
      question: "What is IAM mainly used for?",
      options: ["Storing videos", "Controlling who can access your AWS account and what they can do", "Sending emails", "Designing websites"],
      correctIndex: 1,
      explanation: "IAM (Identity and Access Management) controls who can access your AWS account and what they're allowed to do.",
    },
    {
      question: "What does 'serverless computing' mean?",
      options: ["There are no computers involved at all", "Running your code without having to manage or set up a server yourself", "A computer that never turns on", "Free computing forever"],
      correctIndex: 1,
      explanation: "Serverless computing means running your code without provisioning or managing servers yourself. AWS handles that part.",
    },
    {
      question: "What is AWS Lambda mainly used for?",
      options: ["Storing large files", "Running small pieces of code automatically, without managing a server", "Managing domain names", "Video editing"],
      correctIndex: 1,
      explanation: "AWS Lambda runs small pieces of code automatically in response to events, with no server management needed.",
    },
    {
      question: "This service's icon is an orange circle with a lightning-bolt symbol, used to run code without managing a server. Which service is it?",
      options: ["AWS Lambda", "Amazon S3", "Amazon Route 53", "Amazon RDS"],
      correctIndex: 0,
      explanation: "The lightning-bolt icon represents AWS Lambda, which \"triggers\" code to run instantly.",
      icon: "lambda",
    },
    {
      question: "What does a CDN (Content Delivery Network) do?",
      options: ["Stores your passwords", "Speeds up delivery of content by serving it from servers closer to the user", "Blocks viruses", "Creates websites automatically"],
      correctIndex: 1,
      explanation: "A CDN speeds up content delivery by serving it from servers physically closer to the user.",
    },
    {
      question: "Amazon CloudFront is AWS's version of what kind of service?",
      options: ["A CDN (Content Delivery Network)", "A database", "A search engine", "An email service"],
      correctIndex: 0,
      explanation: "Amazon CloudFront is AWS's Content Delivery Network (CDN) service.",
    },
    {
      question: "What is an 'instance' in AWS?",
      options: ["A type of error", "A single virtual server that you rent and run in the cloud", "A backup file", "A type of AWS discount"],
      correctIndex: 1,
      explanation: "An \"instance\" is a single virtual server you launch and run in the cloud, most commonly via EC2.",
    },
    {
      question: "This service's icon looks like a small database cylinder, AWS's managed database service. Which service is it?",
      options: ["Amazon RDS", "Amazon S3", "AWS IAM", "Amazon EC2"],
      correctIndex: 0,
      explanation: "The cylinder icon represents Amazon RDS, AWS's managed relational database service.",
      icon: "rds",
    },
    {
      question: "What does it mean for a system to be 'scalable'?",
      options: ["It never changes", "It can grow or shrink its resources based on demand", "It only works on one device", "It is always free"],
      correctIndex: 1,
      explanation: "A scalable system can grow or shrink its resources automatically to match demand.",
    },
    {
      question: "Which of these is a direct competitor to AWS in cloud computing?",
      options: ["Microsoft Azure", "Adobe Photoshop", "Spotify", "Netflix"],
      correctIndex: 0,
      explanation: "Microsoft Azure is one of AWS's main competitors in cloud computing, alongside Google Cloud.",
    },
  ],
  hard: [
    {
      question: "What does 'VPC' stand for?",
      options: ["Virtual Private Cloud", "Very Personal Computer", "Verified Public Connection", "Virtual Public Center"],
      correctIndex: 0,
      explanation: "VPC stands for Virtual Private Cloud, an isolated network you control within AWS.",
    },
    {
      question: "What is an 'Availability Zone'?",
      options: ["A weather forecast zone", "An isolated data center location within an AWS Region, used for backup", "A type of AWS discount code", "A social media hashtag"],
      correctIndex: 1,
      explanation: "An Availability Zone is an isolated data center location within a Region, used for redundancy.",
    },
    {
      question: "What is Amazon RDS mainly used for?",
      options: ["Managing databases", "Editing photos", "Hosting games", "Sending text messages"],
      correctIndex: 0,
      explanation: "Amazon RDS (Relational Database Service) is AWS's managed service for running databases.",
    },
    {
      question: "What does 'auto-scaling' allow a system to do?",
      options: ["Automatically delete old files", "Automatically add or remove computing resources based on demand", "Automatically translate languages", "Automatically create backups every second"],
      correctIndex: 1,
      explanation: "Auto-scaling automatically adds or removes computing resources to match real-time demand.",
    },
    {
      question: "What is a 'load balancer' used for?",
      options: ["Balancing a computer on a desk", "Spreading incoming traffic across multiple servers so none gets overloaded", "Charging your laptop faster", "Compressing files"],
      correctIndex: 1,
      explanation: "A load balancer spreads incoming traffic across multiple servers so no single one gets overwhelmed.",
    },
    {
      question: "What does Amazon Route 53 help manage?",
      options: ["Domain names / website addresses (DNS)", "Employee payroll", "Video streaming quality", "Password resets"],
      correctIndex: 0,
      explanation: "Amazon Route 53 is AWS's DNS service. It manages domain names and routes traffic to them.",
    },
    {
      question: "This service's icon is a globe with a signal/network look, and it manages domain names and routes traffic. Which service is it?",
      options: ["Amazon Route 53", "AWS Lambda", "Amazon S3", "Amazon CloudFront"],
      correctIndex: 0,
      explanation: "The globe-with-signal icon represents Amazon Route 53, which routes traffic using domain names (DNS).",
      icon: "route53",
    },
    {
      question: "What does 'IaaS' stand for?",
      options: ["Infrastructure as a Service", "Internet as a Subscription", "Information and Storage Service", "Instant Access as a System"],
      correctIndex: 0,
      explanation: "IaaS stands for Infrastructure as a Service: renting raw computing infrastructure like servers and storage.",
    },
    {
      question: "In AWS product names (like 'Elastic' Compute Cloud), what does 'elastic' generally mean?",
      options: ["Made of rubber", "Can automatically grow or shrink based on need", "Cannot be changed once set up", "Only available on weekends"],
      correctIndex: 1,
      explanation: "\"Elastic\" in AWS product names means the resource can automatically grow or shrink based on need.",
    },
    {
      question: "What is an SDK, in simple terms?",
      options: ["A type of virus", "A toolkit developers use to build apps that connect with AWS", "A cloud storage folder", "A pricing model"],
      correctIndex: 1,
      explanation: "An SDK (Software Development Kit) is a toolkit developers use to build applications that connect with AWS.",
    },
    {
      question: "Which of these is NOT a real AWS service?",
      options: ["Amazon S3", "Amazon Lambda", "Amazon CloudPrint", "Amazon EC2"],
      correctIndex: 2,
      explanation: "Amazon CloudPrint isn't a real AWS service. S3, Lambda, and EC2 all are.",
    },
  ],
};

export const QUESTION_DURATION_MS = 10000;
