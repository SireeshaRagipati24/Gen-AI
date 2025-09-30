import React, { useState } from 'react';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReferralLink } from '@/components/ReferralLink';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Check, 
  Sparkles, 
  ArrowLeft, 
  CreditCard, 
  Wallet, 
  Banknote,
  Smartphone,
  User,
  Calendar,
  Lock,
  ShieldCheck,
  Crown,
  Gift,
  Star,
  Zap,
  TrendingUp,
  Users,
  Share2
} from 'lucide-react';

// Premium Upgrade Modal Component
const PremiumUpgradeModal = ({ isOpen, onClose, creditsRemaining }) => {
  const maxFreeCredits = 50;
  const creditsUsed = maxFreeCredits - creditsRemaining;
  const percentageUsed = (creditsUsed / maxFreeCredits) * 100;
  
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  const pricingPlans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '700',
      period: '/month',
      description: 'Perfect for individuals and small creators',
      features: [
        '200 AI-generated posts per month',
        'Basic templates library',
        '3 social media accounts',
        'Basic analytics',
        'Email support',
      ],
      popular: false,
      color: 'default'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '2400',
      period: '/month',
      description: 'Ideal for businesses and marketing teams',
      features: [
        '1000 AI-generated posts per month',
        'Premium templates library',
        '10 social media accounts',
        'Advanced analytics',
        'Priority support',
        'Team collaboration',
        'Brand kit',
      ],
      popular: true,
      color: 'premium'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '8200',
      period: '/month',
      description: 'For large organizations with advanced needs',
      features: [
        'Unlimited AI-generated posts',
        'Custom templates',
        'Unlimited social accounts',
        'Advanced analytics & reporting',
        'Dedicated account manager',
        'API access',
        'White-label solution',
        'Custom integrations',
      ],
      popular: false,
      color: 'success'
    },
  ];

  const banks = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
    'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda',
    'Canara Bank', 'Union Bank of India', 'IndusInd Bank'
  ];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setPaymentStep(true);
  };

  const handleBackToPlans = () => {
    setPaymentStep(false);
    setSelectedPlan(null);
    setPaymentMethod(null);
  };

  const handleBackToMethods = () => {
    setPaymentMethod(null);
  };

  const handlePayment = (method) => {
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      alert(`Payment successful with ${method}! Welcome to ${selectedPlan.name} plan!`);
      onClose();
      // Reset state
      setPaymentStep(false);
      setSelectedPlan(null);
      setPaymentMethod(null);
    }, 2000);
  };

  const renderPaymentMethodSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBackToPlans}
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Plans
        </Button>
        <div className="text-right">
          <h3 className="text-2xl font-bold text-foreground">{selectedPlan.name} Plan</h3>
          <p className="text-xl font-semibold text-primary">{selectedPlan.price}{selectedPlan.period}</p>
        </div>
      </div>
      
      <div className="text-center mb-8">
        <h4 className="text-2xl font-bold text-foreground mb-2">Choose Your Payment Method</h4>
        <p className="text-muted-foreground">Secure, fast, and trusted by millions</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Credit/Debit Card */}
        <Card 
          className="relative overflow-hidden border-2 hover:border-primary cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
          onClick={() => setPaymentMethod('card')}
        >
          <CardContent className="p-6">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-bl-3xl" />
            <div className="relative">
              <div className="flex items-center mb-4">
                <div className="bg-primary/10 p-3 rounded-xl mr-4 group-hover:bg-primary/20 transition-colors">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h5 className="text-lg font-bold text-foreground">Card Payment</h5>
                  <p className="text-sm text-muted-foreground">Instant & Secure</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 mr-2 text-success" />
                  256-bit SSL Encrypted
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Check className="w-4 h-4 mr-2 text-success" />
                  Visa, Mastercard, Rupay
                </div>
              </div>
              
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded text-white text-xs flex items-center justify-center font-bold">VISA</div>
                <div className="w-10 h-6 bg-gradient-to-r from-red-600 to-orange-600 rounded text-white text-xs flex items-center justify-center font-bold">MC</div>
                <div className="w-10 h-6 bg-gradient-to-r from-green-600 to-green-800 rounded text-white text-xs flex items-center justify-center font-bold">RuP</div>
              </div>
              
              <div className="text-center">
                <span className="text-xs text-success font-medium bg-success/10 px-2 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* UPI Payment */}
        <Card 
          className="relative overflow-hidden border-2 hover:border-accent cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
          onClick={() => setPaymentMethod('upi')}
        >
          <CardContent className="p-6">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/10 to-accent/5 rounded-bl-3xl" />
            <div className="relative">
              <div className="flex items-center mb-4">
                <div className="bg-accent/10 p-3 rounded-xl mr-4 group-hover:bg-accent/20 transition-colors">
                  <Smartphone className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h5 className="text-lg font-bold text-foreground">UPI Payment</h5>
                  <p className="text-sm text-muted-foreground">Quick & Easy</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Zap className="w-4 h-4 mr-2 text-warning" />
                  Instant Payment
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Check className="w-4 h-4 mr-2 text-success" />
                  No Card Details Required
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="h-8 bg-gradient-to-r from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white text-xs font-bold">GPay</div>
                <div className="h-8 bg-gradient-to-r from-gray-800 to-black rounded-lg flex items-center justify-center text-white text-xs font-bold">PhonePe</div>
                <div className="h-8 bg-gradient-to-r from-pink-600 to-pink-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">Paytm</div>
                <div className="h-8 bg-gradient-to-r from-green-500 to-green-700 rounded-lg flex items-center justify-center text-white text-xs font-bold">BHIM</div>
              </div>
              
              <div className="text-center">
                <span className="text-xs text-warning font-medium bg-warning/10 px-2 py-1 rounded-full">
                  Fastest
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Net Banking */}
        <Card 
          className="relative overflow-hidden border-2 hover:border-info cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
          onClick={() => setPaymentMethod('netbanking')}
        >
          <CardContent className="p-6">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-info/10 to-info/5 rounded-bl-3xl" />
            <div className="relative">
              <div className="flex items-center mb-4">
                <div className="bg-info/10 p-3 rounded-xl mr-4 group-hover:bg-info/20 transition-colors">
                  <Banknote className="w-8 h-8 text-info" />
                </div>
                <div>
                  <h5 className="text-lg font-bold text-foreground">Net Banking</h5>
                  <p className="text-sm text-muted-foreground">Direct Bank Transfer</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 mr-2 text-success" />
                  Bank-level Security
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Check className="w-4 h-4 mr-2 text-success" />
                  All Major Banks
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="h-8 bg-gradient-to-r from-blue-800 to-blue-900 rounded-lg flex items-center justify-center text-white text-xs font-bold">SBI</div>
                <div className="h-8 bg-gradient-to-r from-red-700 to-red-800 rounded-lg flex items-center justify-center text-white text-xs font-bold">HDFC</div>
                <div className="h-8 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg flex items-center justify-center text-white text-xs font-bold">ICICI</div>
                <div className="h-8 bg-gradient-to-r from-purple-700 to-purple-800 rounded-lg flex items-center justify-center text-white text-xs font-bold">Axis</div>
              </div>
              
              <div className="text-center">
                <span className="text-xs text-info font-medium bg-info/10 px-2 py-1 rounded-full">
                  Trusted
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Order Summary */}
      <Card className="mt-8 border-2 border-muted bg-gradient-to-r from-muted/30 to-muted/10">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h5 className="text-lg font-semibold text-foreground">Order Summary</h5>
              <p className="text-muted-foreground">{selectedPlan.name} Plan - {selectedPlan.description}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{selectedPlan.price}{selectedPlan.period}</p>
              <p className="text-sm text-muted-foreground">Billed monthly</p>
            </div>
          </div>
          
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{selectedPlan.price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST (18%)</span>
              <span className="font-medium">126</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-foreground">Total Amount</span>
                <span className="text-2xl font-bold text-primary">826</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center text-success">
              <ShieldCheck className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Your payment is 100% secure and protected</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCardPaymentForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBackToMethods}
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Payment Methods
        </Button>
        <div className="text-right">
          <h3 className="text-2xl font-bold text-foreground">Card Payment</h3>
          <p className="text-lg font-semibold text-primary">{selectedPlan.price}{selectedPlan.period}</p>
        </div>
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber" className="flex items-center mb-2">
                    <CreditCard className="w-4 h-4 mr-2 text-primary" />
                    Card Number
                  </Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="h-12 text-lg"
                  />
                </div>

                <div>
                  <Label htmlFor="cardName" className="flex items-center mb-2">
                    <User className="w-4 h-4 mr-2 text-primary" />
                    Cardholder Name
                  </Label>
                  <Input
                    id="cardName"
                    type="text"
                    placeholder="John Doe"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry" className="flex items-center mb-2">
                      <Calendar className="w-4 h-4 mr-2 text-primary" />
                      Expiry Date
                    </Label>
                    <Input
                      id="expiry"
                      type="text"
                      placeholder="MM/YY"
                      className="h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cvv" className="flex items-center mb-2">
                      <Lock className="w-4 h-4 mr-2 text-primary" />
                      CVV
                    </Label>
                    <Input
                      id="cvv"
                      type="password"
                      placeholder="123"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Button 
                    type="button"
                    className="w-full h-12 text-lg"
                    variant="default"
                    onClick={() => handlePayment('Credit Card')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Pay Securely
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 mr-2 text-success" />
              <span>Your payment details are securely encrypted</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  const renderUpiPaymentForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBackToMethods}
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Payment Methods
        </Button>
        <div className="text-right">
          <h3 className="text-2xl font-bold text-foreground">UPI Payment</h3>
          <p className="text-lg font-semibold text-primary">{selectedPlan.price}{selectedPlan.period}</p>
        </div>
      </div>

      <Card className="border-2 border-accent/20">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="upiId" className="flex items-center mb-2">
                <Smartphone className="w-4 h-4 mr-2 text-accent" />
                UPI ID
              </Label>
              <Input
                id="upiId"
                type="text"
                placeholder="yourname@upi"
                className="h-12 text-lg"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-2">Enter your UPI ID (e.g. 1234567890@ybl, name@oksbi)</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                <Card 
                  key={app}
                  className="border-2 hover:border-accent cursor-pointer transition-all p-4 text-center"
                  onClick={() => setUpiId(app.toLowerCase().replace(' ', '') + '@upi')}
                >
                  <div className="w-12 h-12 bg-accent/10 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-accent" />
                  </div>
                  <span className="text-sm font-medium">{app}</span>
                </Card>
              ))}
            </div>

            <Button 
              type="button"
              className="w-full h-12 text-lg"
              variant="default"
              onClick={() => handlePayment('UPI')}
              disabled={isProcessing || !upiId}
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  Pay via UPI
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNetBankingForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBackToMethods}
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Payment Methods
        </Button>
        <div className="text-right">
          <h3 className="text-2xl font-bold text-foreground">Net Banking</h3>
          <p className="text-lg font-semibold text-primary">{selectedPlan.price}{selectedPlan.period}</p>
        </div>
      </div>

      <Card className="border-2 border-info/20">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="bank" className="flex items-center mb-2">
                <Banknote className="w-4 h-4 mr-2 text-info" />
                Select Bank
              </Label>
              <Select onValueChange={setSelectedBank} value={selectedBank}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Select your bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map(bank => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['SBI', 'HDFC', 'ICICI', 'Axis'].map(bank => (
                <Card 
                  key={bank}
                  className="border-2 hover:border-info cursor-pointer transition-all p-4 text-center"
                  onClick={() => setSelectedBank(bank + ' Bank')}
                >
                  <div className="w-12 h-12 bg-info/10 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-info" />
                  </div>
                  <span className="text-sm font-medium">{bank}</span>
                </Card>
              ))}
            </div>

            <Button 
              type="button"
              className="w-full h-12 text-lg"
              variant="default"
              onClick={() => handlePayment('Net Banking')}
              disabled={isProcessing || !selectedBank}
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Proceed to Bank
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center text-3xl font-bold">
            <Crown className="w-8 h-8 mr-3 text-premium" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription className="text-lg">
            You've used {creditsUsed} of your {maxFreeCredits} free credits ({percentageUsed.toFixed(0)}%). 
            Unlock unlimited potential with our premium plans.
          </DialogDescription>
        </DialogHeader>

        {paymentStep ? (
          paymentMethod === 'card' ? renderCardPaymentForm() :
          paymentMethod === 'upi' ? renderUpiPaymentForm() :
          paymentMethod === 'netbanking' ? renderNetBankingForm() :
          renderPaymentMethodSelection()
        ) : (
          <div className="space-y-8">
            {/* Usage Progress */}
            <div className="bg-muted/30 rounded-xl p-6 mb-8 border border-border">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium">Credits Used</span>
                <span className="text-sm font-medium">
                  {creditsUsed}/{maxFreeCredits} ({creditsRemaining} remaining)
                </span>
              </div>
              <Progress value={percentageUsed} className="h-3" />
              <div className="mt-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Upgrade now to get unlimited credits and premium features
                </p>
              </div>
            </div>

            {/* Pricing Plans */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {pricingPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative border-2 transition-all duration-300 hover:shadow-xl ${
                    plan.popular 
                      ? 'border-premium shadow-lg ring-1 ring-premium/20 scale-105' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-premium text-premium-foreground px-4 py-1 shadow-lg">
                        <Star className="w-3 h-3 mr-1" fill="currentColor" />
                        MOST POPULAR
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <div className="flex items-baseline justify-center mt-4">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground ml-1">{plan.period}</span>
                    </div>
                    <p className="text-muted-foreground mt-2">{plan.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <Check className="w-5 h-5 text-success mr-3 mt-0.5 shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full ${plan.popular ? 'premium' : plan.color}`}
                      variant={plan.popular ? 'premium' : plan.color}
                      size="lg"
                      onClick={() => handlePlanSelect(plan)}
                    >
                      {plan.popular && <Sparkles className="w-4 h-4 mr-2" />}
                      Choose {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Benefits Section */}
            <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-8 border border-border">
              <h3 className="text-2xl font-bold mb-6 text-center">Why Choose Premium?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-success/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-success" />
                  </div>
                  <h4 className="font-semibold mb-2">Lightning Fast</h4>
                  <p className="text-sm text-muted-foreground">Generate content 10x faster with premium processing</p>
                </div>
                <div className="text-center">
                  <div className="bg-info/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-info" />
                  </div>
                  <h4 className="font-semibold mb-2">Advanced Analytics</h4>
                  <p className="text-sm text-muted-foreground">Deep insights and performance tracking for your content</p>
                </div>
                <div className="text-center">
                  <div className="bg-warning/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-warning" />
                  </div>
                  <h4 className="font-semibold mb-2">Priority Support</h4>
                  <p className="text-sm text-muted-foreground">24/7 premium support with dedicated account manager</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Main Settings Page Component
const SettingsPage = () => {
  const { usage, refreshUsage } = useUsageTracking();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const usagePercentage = (usage.used / usage.total) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your account, track usage, and unlock premium features
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Usage & Premium */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usage Overview Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <TrendingUp className="w-6 h-6 mr-3 text-primary" />
                  Usage Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">{usage.total}</div>
                    <div className="text-sm text-muted-foreground">Total Credits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-warning mb-1">{usage.used}</div>
                    <div className="text-sm text-muted-foreground">Credits Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-success mb-1">{usage.available}</div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {usagePercentage.toFixed(1)}% used
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-4" />
                </div>
                
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                  <div>
                    <p className="font-medium">Running low on credits?</p>
                    <p className="text-sm text-muted-foreground">Upgrade to premium for unlimited access</p>
                  </div>
                  <Button 
                    variant="premium" 
                    onClick={() => setIsPremiumModalOpen(true)}
                    className="shrink-0"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Status Card */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <User className="w-6 h-6 mr-3 text-info" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Plan Type:</span>
                      {usage.isPremium ? (
                        <Badge variant="outline" className="bg-premium/10 text-premium border-premium/20">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Free Plan
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Member Since:</span>
                      <span className="text-muted-foreground">Jan 2024</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Referrals:</span>
                      <Badge variant="outline" className="bg-success/10 text-success">
                        <Users className="w-3 h-3 mr-1" />
                        {usage.referralsCount}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Bonus Points:</span>
                      <Badge variant="outline" className="bg-warning/10 text-warning">
                        <Gift className="w-3 h-3 mr-1" />
                        +{usage.referralsCount * 5}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Referral Program */}
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-success/5">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Share2 className="w-5 h-5 mr-3 text-success" />
                  Referral Program
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usage.referralCode ? (
                  <ReferralLink code={usage.referralCode} />
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-pulse bg-muted rounded-lg h-20 mb-4"></div>
                    <p className="text-muted-foreground">Loading referral information...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-info/10 to-info/5">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-info mb-1">24/7</div>
                  <div className="text-xs text-muted-foreground">Support</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-success/10 to-success/5">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-success mb-1">99.9%</div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Premium Upgrade Modal */}
        <PremiumUpgradeModal 
          isOpen={isPremiumModalOpen}
          onClose={() => setIsPremiumModalOpen(false)}
          creditsRemaining={usage?.available || 15}
        />
      </div>
    </div>
  );
};

export default SettingsPage;