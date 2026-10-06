export interface ConnectionsCategory {
  name: string;
  words: string[];
}

// 8 categories of 4 words each, drawn from the orientation's content so the
// groupings are things attendees just learned, not trivia from nowhere.
export const CONNECTIONS_CATEGORIES: ConnectionsCategory[] = [
  { name: "Global Infrastructure", words: ["Region", "Availability Zone", "Edge Location", "Local Zone"] },
  { name: "Cloud Benefits", words: ["On Demand", "Agile", "Elastic", "Cost Efficient"] },
  { name: "AWS Services", words: ["S3", "Lambda", "EC2", "Bedrock"] },
  { name: "Services With Everyday Names", words: ["Glacier", "Snowball", "Lightsail", "Glue"] },
  { name: "Ways To Pay", words: ["Reserved", "Spot", "Savings Plan", "Free Tier"] },
  { name: "Security Basics", words: ["Encryption", "MFA", "Least Privilege", "Firewall"] },
  { name: "Where Data Lives", words: ["Bucket", "Volume", "Snapshot", "Archive"] },
  { name: "Gen AI", words: ["Model", "Prompt", "Agent", "Token"] },
];
