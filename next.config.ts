import type { NextConfig } from "next";
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['198.18.0.1'],
};

export default withPayload(nextConfig);
