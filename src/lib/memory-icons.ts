export interface MemoryIcon {
  id: string;
  label: string;
}

/**
 * PLACEHOLDER tiles — swap in real AWS service icon images once the club
 * sends them. Each card just needs an `id` (for matching) and a `label`
 * (shown on the tile); add an `imageSrc` field here and reference it from
 * the game page once real icon files exist in /public.
 */
export const MEMORY_ICONS: MemoryIcon[] = [
  { id: "ec2", label: "EC2" },
  { id: "s3", label: "S3" },
  { id: "lambda", label: "Lambda" },
  { id: "dynamodb", label: "DynamoDB" },
  { id: "iam", label: "IAM" },
  { id: "vpc", label: "VPC" },
  { id: "cloudfront", label: "CloudFront" },
  { id: "sqs", label: "SQS" },
  { id: "sns", label: "SNS" },
  { id: "ecs", label: "ECS" },
  { id: "route53", label: "Route 53" },
  { id: "rds", label: "RDS" },
];

export const BOARD_SIZES = {
  small: 6, // 12 cards, 6 pairs
  standard: 8, // 16 cards, 8 pairs
} as const;
