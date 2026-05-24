// ============================================================
// HAYAT Mobile — Settings Screen
// ============================================================
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/UI';
import { colors, spacing, radius, fonts, fontSize } from '../theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    { section: 'Hesap', items: [
      { icon: '👤', label: 'Profil Düzenle', onPress: () => {} },
      { icon: '🔔', label: 'Bildirim Ayarları', onPress: () => {} },
      { icon: '🌍', label: 'Dil ve Bölge', subtitle: 'Türkçe', onPress: () => {} },
      { icon: '🎨', label: 'Tema', subtitle: 'Koyu', onPress: () => {} },
    ]},
    { section: 'Veri', items: [
      { icon: '📤', label: 'Verileri Dışa Aktar', onPress: () => {} },
      { icon: '🗑️', label: 'Hesabı Sil', danger: true, onPress: () => {
        Alert.alert('Hesap Silme', 'Bu işlem geri alınamaz. Emin misiniz?', [
          { text: 'İptal', style: 'cancel' },
          { text: 'Sil', style: 'destructive', onPress: () => {} },
        ]);
      }},
    ]},
    { section: 'Hakkında', items: [
      { icon: '📋', label: 'Kullanım Koşulları', onPress: () => {} },
      { icon: '🔒', label: 'Gizlilik Politikası', onPress: () => {} },
      { icon: 'ℹ️', label: 'Uygulama Hakkında', subtitle: 'v1.0.0', onPress: () => {} },
    ]},
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Profile Header */}
      <Card style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={{ fontSize: 32 }}>👤</Text>
        </View>
        <Text style={s.userName}>{user?.full_name || 'Kullanıcı'}</Text>
        <Text style={s.userEmail}>{user?.email}</Text>
        <View style={s.planBadge}>
          <Text style={s.planText}>{user?.plan === 'pro' ? '⭐ Pro' : '🆓 Free'}</Text>
        </View>
      </Card>

      {/* Pro Upsell */}
      {user?.plan !== 'pro' && (
        <Card style={s.proCard}>
          <Text style={{ fontSize: 20, marginBottom: 6 }}>⭐</Text>
          <Text style={{ fontSize: fontSize.lg, fontFamily: fonts.semibold, color: colors.amber }}>HAYAT Pro</Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.textDim, marginTop: 4, marginBottom: spacing.md }}>
            Sınırsız AI sohbet, gelişmiş analizler ve daha fazlası
          </Text>
          <Button title="Pro'ya Yükselt" size="sm" />
        </Card>
      )}

      {/* Menu Items */}
      {menuItems.map(section => (
        <View key={section.section} style={{ marginTop: spacing.xl }}>
          <Text style={s.sectionTitle}>{section.section}</Text>
          <Card style={{ padding: 0 }}>
            {section.items.map((item, i) => (
              <TouchableOpacity key={item.label} onPress={item.onPress} activeOpacity={0.6}
                style={[s.menuItem, i < section.items.length - 1 && s.menuItemBorder]}>
                <Text style={{ fontSize: 18, width: 28 }}>{item.icon}</Text>
                <Text style={[s.menuLabel, item.danger && { color: colors.red }]}>{item.label}</Text>
                {item.subtitle && <Text style={s.menuSubtitle}>{item.subtitle}</Text>}
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>›</Text>
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      ))}

      {/* Logout */}
      <Button title="Çıkış Yap" variant="danger" onPress={handleLogout}
        style={{ marginTop: spacing.xxl }} icon="🚪" />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  profileCard: { alignItems: 'center', padding: spacing.xxl },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    borderWidth: 2, borderColor: colors.amber,
  },
  userName: { fontSize: fontSize.xl, fontFamily: fonts.semibold, color: colors.text },
  userEmail: { fontSize: fontSize.sm, color: colors.textDim, marginTop: 2 },
  planBadge: {
    marginTop: spacing.md, paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: radius.full, backgroundColor: colors.amberDim,
  },
  planText: { fontSize: fontSize.sm, color: colors.amber, fontFamily: fonts.semibold },
  proCard: { marginTop: spacing.lg, alignItems: 'center', padding: spacing.xxl, borderColor: colors.amber + '40' },
  sectionTitle: { fontSize: fontSize.sm, fontFamily: fonts.semibold, color: colors.textDim, marginBottom: spacing.sm, marginLeft: 4 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.text, fontFamily: fonts.medium },
  menuSubtitle: { fontSize: fontSize.sm, color: colors.textDim },
});
