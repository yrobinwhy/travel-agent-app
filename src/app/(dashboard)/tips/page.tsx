import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Lightbulb, Star, ArrowRight } from "lucide-react";
import Link from "next/link";

const featuredTips = [
  {
    title: "Economy + Points Upgrade Strategy",
    description: "Book economy class and use miles to upgrade — often 40-60% cheaper than buying business outright.",
    category: "Strategy",
    icon: TrendingUp,
  },
  {
    title: "Transfer Partner Sweet Spots",
    description: "Chase UR → Hyatt at 1:1 is one of the best transfer ratios. Amex MR → ANA for first class is unbeatable value.",
    category: "Points",
    icon: Star,
  },
  {
    title: "Point of Sale Pricing",
    description: "The same flight can cost 30% less when booked from a different country. Our AI checks multiple markets automatically.",
    category: "Savings",
    icon: Lightbulb,
  },
  {
    title: "Flexible Date Searching",
    description: "Flying Tuesday-Thursday instead of weekends can save $200-500 on business class international flights.",
    category: "Timing",
    icon: TrendingUp,
  },
];

export default function TipsPage() {
  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-lg font-semibold">Tips &amp; Deals</h1>
      </header>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Featured Tips */}
        <div className="space-y-3">
          {featuredTips.map((tip, i) => (
            <Card key={i} className="card-hover">
              <CardContent className="flex items-start gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 flex-shrink-0">
                  <tip.icon className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{tip.title}</h3>
                    <Badge variant="outline" className="text-[10px]">{tip.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 mb-4">
              <Lightbulb className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-medium mb-1">Personalized tips coming soon</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              We&apos;ll scan sources like The Points Guy and tailor deal recommendations based on your loyalty programs and travel patterns.
            </p>
            <Link href="/chat" className="mt-3">
              <Badge variant="outline" className="hover:bg-muted cursor-pointer">
                Ask the AI for tips <ArrowRight className="inline h-3 w-3 ml-1" />
              </Badge>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
