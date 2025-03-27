import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

// This component should be dynamically imported and wrapped in Suspense in the parent
const MindmapChatWithSearchParams: React.FC = () => {
  const searchParams = useSearchParams();
  const initialMindmap = searchParams.get("mindmap") || "";

  return <>{initialMindmap}</>;
};

export default MindmapChatWithSearchParams;