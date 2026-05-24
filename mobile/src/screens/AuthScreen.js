// ============================================================
// HAYAT Mobile — Auth Screen (Login + Register)
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/UI';
import { colors, spacing, radius, fonts, fontSize } from '../theme';

export default function AuthScreen() {
  const { login, register, error, clearError, isLoading } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!email.includes('@')) e.email = 'Geçerli e-posta giriniz';
    if (password.length < 8) e.password = 'En az 8 karakter';
    if (mode === 'register' && name.length < 2) e.name = 'İsim giriniz';
    if (mode === 'register' && !/[A-Z]/.test(password)) e.password = 'En az 1 büyük harf gerekli';
    if (mode === 'register' && !/[0-9]/.test(password)) e.password = (e.password || '') + ' En az 1 rakam gerekli';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    clearError();
    try {
      if (mode === 'login') {
        await login(email.toLowerCase().trim(), password);
      } else {
        await register(email.toLowerCase().trim(), password, name.trim());
      }
    } catch (e) {
      Alert.alert('Hata', e.message);
    }
  };

  const toggleMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setErrors({});
    clearError();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>HAYAT</Text>
          <Text style={styles.subtitle}>LIFE OPERATING SYSTEM</Text>
        </View>

        {/* Form */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>
            {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
          </Text>

          {mode === 'register' && (
            <Input
              label="Ad Soyad"
              value={name}
              onChangeText={setName}
              placeholder="Adınız Soyadınız"
              autoCapitalize="words"
              error={errors.name}
              containerStyle={{ marginBottom: spacing.md }}
            />
          )}

          <Input
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            containerStyle={{ marginBottom: spacing.md }}
          />

          <Input
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            containerStyle={{ marginBottom: spacing.xl }}
          />

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>❌ {error}</Text>
            </View>
          )}

          <Button
            title={mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            onPress={handleSubmit}
            loading={isLoading}
            size="lg"
            style={{ marginBottom: spacing.lg }}
          />

          <TouchableOpacity onPress={toggleMode} style={styles.toggleBtn}>
            <Text style={styles.toggleText}>
              {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var? Giriş yap'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Footer */}
        <Text style={styles.footer}>
          Giriş yaparak Kullanım Koşullarını ve{'\n'}Gizlilik Politikasını kabul etmiş olursunuz.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.huge,
  },
  logo: {
    fontSize: 56,
    fontFamily: fonts.serif,
    color: colors.amber,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 4,
    marginTop: 4,
    fontFamily: fonts.medium,
  },
  formCard: {
    padding: spacing.xxl,
  },
  formTitle: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: colors.redDim,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.red,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  toggleBtn: {
    alignItems: 'center',
  },
  toggleText: {
    color: colors.amber,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xxl,
    lineHeight: 18,
  },
});
