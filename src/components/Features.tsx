
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Image, Calendar, BarChart3, Palette, Share2 } from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Content',
    description: 'Generate engaging posts, captions, and hashtags using advanced AI technology.',
  },
  {
    icon: Image,
    title: 'Visual Content Creator',
    description: 'Create stunning graphics, carousels, and stories with our built-in design tools.',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Plan and schedule your content across multiple social media platforms.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track performance and optimize your content strategy with detailed insights.',
  },
  {
    icon: Palette,
    title: 'Brand Consistency',
    description: 'Maintain your brand voice and visual identity across all content.',
  },
  {
    icon: Share2,
    title: 'Multi-Platform Publishing',
    description: 'Publish to Instagram, Facebook, Twitter, LinkedIn, and more with one click.',
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Everything You Need to
            <span className="text-green-600"> Dominate Social Media</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From AI-generated content to advanced analytics, we provide all the tools 
            you need to grow your social media presence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
