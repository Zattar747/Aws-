export interface TwoTruthsItem {
  statements: [string, string, string];
  lieIndex: 0 | 1 | 2;
}

/**
 * PLACEHOLDER round list — swap this out once the club sends the real
 * statements. Rotation only depends on this being a flat array of
 * { statements, lieIndex } objects, so replacing the array is enough.
 */
export const TWO_TRUTHS_ITEMS: TwoTruthsItem[] = [
  {
    statements: [
      "AWS was launched in 2006.",
      "S3 stands for 'Simple Storage Service'.",
      "EC2 instances cannot be resized after launch.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "Lambda functions can run without you managing a server.",
      "DynamoDB is a relational database.",
      "CloudFront is AWS's content delivery network.",
    ],
    lieIndex: 1,
  },
  {
    statements: [
      "IAM is used to manage users and permissions.",
      "Route 53 is AWS's DNS service.",
      "Every AWS account gets unlimited free usage forever.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "A VPC lets you create an isolated network in AWS.",
      "SQS is a fully managed message queuing service.",
      "S3 buckets are region-agnostic and stored everywhere at once.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "Python was first released in 1991.",
      "Git was created by Linus Torvalds.",
      "JSON stands for 'JavaScript Object Notation' and can only be used in JavaScript.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "HTTP status code 404 means 'Not Found'.",
      "TCP guarantees ordered delivery of packets.",
      "A binary search runs in O(n) time.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "The first computer bug was literally a moth stuck in a relay.",
      "RAM stands for 'Random Access Memory'.",
      "A byte is made up of 4 bits.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "Docker containers share the host machine's OS kernel.",
      "Kubernetes was originally developed by Google.",
      "A container image can only ever run on the machine that built it.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "SSDs have no moving parts.",
      "HTTPS encrypts data in transit using TLS.",
      "IPv4 addresses can never run out.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "React was created by Facebook (Meta).",
      "CSS stands for 'Cascading Style Sheets'.",
      "A recursive function can never have a base case.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "AWS Lambda charges are based purely on how long your code runs and memory used.",
      "S3 offers 99.999999999% durability for objects.",
      "An AWS Region contains exactly one data center.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "A CDN caches content closer to users to reduce latency.",
      "Load balancers distribute traffic across multiple servers.",
      "A firewall's main purpose is to speed up your internet connection.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "SQL joins combine rows from two or more tables.",
      "NoSQL databases always enforce a fixed schema.",
      "Indexes can speed up database read queries.",
    ],
    lieIndex: 1,
  },
  {
    statements: [
      "Cloud computing lets you rent compute resources on demand.",
      "Autoscaling can add or remove servers based on demand.",
      "Once you deploy to the cloud, you can never change regions.",
    ],
    lieIndex: 2,
  },
  {
    statements: [
      "Git branches let you work on features in isolation.",
      "A merge conflict happens when two branches change the same lines differently.",
      "'git commit' permanently uploads your code to the internet.",
    ],
    lieIndex: 2,
  },
];
